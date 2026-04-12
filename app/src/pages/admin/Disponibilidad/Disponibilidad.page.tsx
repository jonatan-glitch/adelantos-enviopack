import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, X, Plus, Send, Save, Check } from 'lucide-react'
import { Button } from '@enviopack/epic-ui'
import { toast } from 'react-toastify'
import api from '@/infrastructure/interceptors/api.interceptor'
import { API_ROUTES } from '@/domain/constants'
import type { Chofer } from '@/domain/models'
import styles from './Disponibilidad.module.css'

interface DisponibilidadData {
  fecha: string
  choferes_ids: number[]
  choferes_manuales: string[]
  enviado: boolean
  enviado_at: string | null
}

const tomorrow = () => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

export const DisponibilidadPage = () => {
  const queryClient = useQueryClient()
  const [fecha, setFecha] = useState(tomorrow)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [manuales, setManuales] = useState<string[]>([])
  const [manualInput, setManualInput] = useState('')
  const [search, setSearch] = useState('')
  const [dirty, setDirty] = useState(false)

  // Fetch choferes list
  const { data: choferes = [], isLoading: loadingChoferes } = useQuery({
    queryKey: ['admin-choferes-disponibilidad'],
    queryFn: async () => {
      const res = await api.get<{ items: Chofer[] }>('/api/admin/choferes?page=1&limit=500')
      return res.data.items ?? []
    },
  })

  // Fetch existing disponibilidad for selected date
  const { data: dispData, isLoading: loadingDisp } = useQuery({
    queryKey: ['admin-disponibilidad', fecha],
    queryFn: async () => {
      const res = await api.get<DisponibilidadData>(`${API_ROUTES.ADMIN_DISPONIBILIDAD}?fecha=${fecha}`)
      return res.data
    },
    enabled: !!fecha,
  })

  // Sync state when dispData changes
  const ids = dispData?.choferes_ids ?? []
  const mans = dispData?.choferes_manuales ?? []
  const dispKey = dispData ? `${dispData.fecha}-${ids.join(',')}-${mans.join(',')}` : ''

  // Update local state when server data loads
  useMemo(() => {
    if (dispData) {
      setSelectedIds(dispData.choferes_ids ?? [])
      setManuales(dispData.choferes_manuales ?? [])
      setDirty(false)
    } else {
      setSelectedIds([])
      setManuales([])
      setDirty(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispKey])

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      await api.post(API_ROUTES.ADMIN_DISPONIBILIDAD, {
        fecha,
        choferes_ids: selectedIds,
        choferes_manuales: manuales,
      })
    },
    onSuccess: () => {
      toast.success('Disponibilidad guardada')
      setDirty(false)
      queryClient.invalidateQueries({ queryKey: ['admin-disponibilidad', fecha] })
    },
    onError: () => toast.error('Error al guardar'),
  })

  // Send email mutation
  const sendMutation = useMutation({
    mutationFn: async () => {
      await api.post(`${API_ROUTES.ADMIN_DISPONIBILIDAD}/enviar`, { fecha })
    },
    onSuccess: () => {
      toast.success('Email enviado correctamente')
      queryClient.invalidateQueries({ queryKey: ['admin-disponibilidad', fecha] })
    },
    onError: () => toast.error('Error al enviar el email'),
  })

  // Filtered choferes by search
  const filtered = useMemo(() => {
    if (!search.trim()) return choferes
    const q = search.toLowerCase()
    return choferes.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        c.apellido.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
    )
  }, [choferes, search])

  const toggleChofer = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
    setDirty(true)
  }

  const addManual = () => {
    const name = manualInput.trim()
    if (!name) return
    if (manuales.includes(name)) {
      toast.warning('Ese nombre ya fue agregado')
      return
    }
    setManuales((prev) => [...prev, name])
    setManualInput('')
    setDirty(true)
  }

  const removeManual = (name: string) => {
    setManuales((prev) => prev.filter((n) => n !== name))
    setDirty(true)
  }

  const totalSelected = selectedIds.length + manuales.length

  const handleSave = () => {
    saveMutation.mutate()
  }

  const handleSend = async () => {
    if (dirty) {
      // Save first, then send
      try {
        await api.post(API_ROUTES.ADMIN_DISPONIBILIDAD, {
          fecha,
          choferes_ids: selectedIds,
          choferes_manuales: manuales,
        })
        setDirty(false)
      } catch {
        toast.error('Error al guardar antes de enviar')
        return
      }
    }
    sendMutation.mutate()
  }

  const formatEnviadoAt = (at: string | null) => {
    if (!at) return null
    const d = new Date(at)
    return d.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <h1 className={styles.pageTitle}>Disponibilidad de choferes</h1>
          <p className={styles.pageSubtitle}>
            Marcá los choferes disponibles para tomar carga y enviá el reporte por email
          </p>
        </div>
      </div>

      {/* Date selector + status */}
      <div className={styles.dateRow}>
        <span className={styles.dateLabel}>Disponibilidad para:</span>
        <input
          type="date"
          className={styles.dateInput}
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
        />
        {dispData?.enviado ? (
          <span className={`${styles.badge} ${styles.badgeSent}`}>
            <Check size={13} /> Enviado {formatEnviadoAt(dispData.enviado_at)}
          </span>
        ) : (
          <span className={`${styles.badge} ${styles.badgePending}`}>
            Pendiente de envío
          </span>
        )}
      </div>

      <div className={styles.sections}>
        {/* Section: Choferes del sistema */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Choferes registrados</h2>
          <p className={styles.sectionSubtitle}>Seleccioná los choferes que están disponibles</p>

          <div className={styles.searchBar}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Buscar por nombre o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className={styles.removeBtn} onClick={() => setSearch('')} style={{ position: 'absolute', right: 10 }}>
                <X size={16} />
              </button>
            )}
          </div>

          {loadingChoferes || loadingDisp ? (
            <div className={styles.emptyList}>Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className={styles.emptyList}>
              {search ? 'No se encontraron choferes' : 'No hay choferes registrados'}
            </div>
          ) : (
            <div className={styles.checklist}>
              {filtered.map((c) => {
                const checked = selectedIds.includes(c.id)
                return (
                  <label
                    key={c.id}
                    className={`${styles.checkItem} ${checked ? styles.checkItemSelected : ''}`}
                  >
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={checked}
                      onChange={() => toggleChofer(c.id)}
                    />
                    <span className={styles.checkName}>
                      {c.nombre} {c.apellido}
                    </span>
                    <span className={styles.checkEmail}>{c.email}</span>
                  </label>
                )
              })}
            </div>
          )}

          <p className={styles.selectedCount}>
            {selectedIds.length} chofer(es) del sistema seleccionados
          </p>
        </div>

        {/* Section: Choferes manuales */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Choferes adicionales</h2>
          <p className={styles.sectionSubtitle}>
            Agregá nombres de choferes que no están en el sistema
          </p>

          <div className={styles.addRow}>
            <input
              type="text"
              className={styles.addInput}
              placeholder="Nombre y apellido..."
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addManual()}
            />
            <Button onClick={addManual} disabled={!manualInput.trim()}>
              <Plus size={16} /> Agregar
            </Button>
          </div>

          {manuales.length > 0 && (
            <div className={styles.manualList}>
              {manuales.map((name) => (
                <div key={name} className={styles.manualItem}>
                  <span>{name}</span>
                  <button className={styles.removeBtn} onClick={() => removeManual(name)}>
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {manuales.length === 0 && (
            <div className={styles.emptyList}>No se agregaron choferes adicionales</div>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className={styles.footerActions}>
        <Button onClick={handleSave} disabled={saveMutation.isPending || !dirty}>
          <Save size={16} /> Guardar
        </Button>
        <Button
          onClick={handleSend}
          disabled={sendMutation.isPending || totalSelected === 0}
        >
          <Send size={16} /> {dispData?.enviado ? 'Reenviar email' : 'Enviar email'}
        </Button>
        <span className={styles.footerInfo}>
          {totalSelected} chofer(es) disponibles en total
        </span>
      </div>
    </div>
  )
}
