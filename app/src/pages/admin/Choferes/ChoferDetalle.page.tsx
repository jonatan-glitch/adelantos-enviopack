import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, X, Pencil, Check } from 'lucide-react'
import { Button, Spinner } from '@enviopack/epic-ui'
import { toast } from 'react-toastify'
import dayjs from 'dayjs'
import api from '@/infrastructure/interceptors/api.interceptor'
import type { Chofer, SolicitudAdelanto, Factura } from '@/domain/models'
import { ROUTES, TASA_MINIMA } from '@/domain/constants'
import { StatusBadge } from '@/components/StatusBadge/StatusBadge'
import {
  estadoSolicitudLabel,
  estadoSolicitudVariant,
  estadoFacturaLabel,
  estadoFacturaVariant,
} from '@/components/StatusBadge/StatusBadge'
import styles from './ChoferDetalle.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChoferDetalle extends Chofer {
  invitacion_aceptada?: boolean
}

const formatCurrency = (n: number) =>
  n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

const formatDate = (d: string) => dayjs(d).format('DD/MM/YYYY')

// ═══════════════════════════════════════════════════════════════════════════════
// ── Page ──────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export const ChoferDetallePage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [editandoTasa, setEditandoTasa] = useState(false)
  const [tasaInput, setTasaInput] = useState('')
  const [tasaError, setTasaError] = useState('')

  // ── Queries ─────────────────────────────────────────────────────────────────

  const { data: chofer, isLoading: loadingChofer } = useQuery({
    queryKey: ['admin-chofer', id],
    queryFn: async () => {
      const res = await api.get<{ data: ChoferDetalle }>(`/api/admin/choferes/${id}`)
      return res.data.data
    },
    enabled: !!id,
  })

  const { data: adelantos, isLoading: loadingAdelantos } = useQuery({
    queryKey: ['admin-chofer-adelantos', id],
    queryFn: async () => {
      const res = await api.get<{ data: { items: SolicitudAdelanto[] } }>(
        `/api/admin/choferes/${id}/adelantos?page=1&limit=10`
      )
      return res.data.data.items
    },
    enabled: !!id,
  })

  const { data: facturas, isLoading: loadingFacturas } = useQuery({
    queryKey: ['admin-chofer-facturas', id],
    queryFn: async () => {
      const res = await api.get<{ data: { items: Factura[] } }>(
        `/api/admin/choferes/${id}/facturas?page=1&limit=10`
      )
      return res.data.data.items
    },
    enabled: !!id,
  })

  // ── Mutations ────────────────────────────────────────────────────────────────

  const toggleHabilitadoMutation = useMutation({
    mutationFn: () =>
      api.put(`/api/admin/choferes/${id}`, { habilitado: !chofer?.habilitado }),
    onSuccess: () => {
      toast.success(
        chofer?.habilitado ? 'Chofer deshabilitado correctamente' : 'Chofer habilitado correctamente'
      )
      qc.invalidateQueries({ queryKey: ['admin-chofer', id] })
      qc.invalidateQueries({ queryKey: ['admin-choferes'] })
    },
    onError: () => toast.error('Error al actualizar el estado del chofer'),
  })

  const tasaMutation = useMutation({
    mutationFn: (tasa_personal: number | null) =>
      api.put(`/api/admin/choferes/${id}`, { tasa_personal }),
    onSuccess: () => {
      toast.success('Tasa actualizada correctamente')
      qc.invalidateQueries({ queryKey: ['admin-chofer', id] })
      qc.invalidateQueries({ queryKey: ['admin-choferes'] })
      setEditandoTasa(false)
      setTasaInput('')
      setTasaError('')
    },
    onError: () => toast.error('Error al actualizar la tasa'),
  })

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const abrirEditarTasa = () => {
    setTasaInput(chofer?.tasa_personal != null ? String(chofer.tasa_personal) : '')
    setTasaError('')
    setEditandoTasa(true)
  }

  const guardarTasa = () => {
    if (tasaInput.trim() === '') {
      // Limpiar tasa personalizada (volver a global)
      tasaMutation.mutate(null)
      return
    }
    const n = parseFloat(tasaInput)
    if (isNaN(n) || n < TASA_MINIMA || n > 100) {
      setTasaError(`La tasa debe estar entre ${TASA_MINIMA} y 100`)
      return
    }
    tasaMutation.mutate(n)
  }

  const cancelarEditarTasa = () => {
    setEditandoTasa(false)
    setTasaInput('')
    setTasaError('')
  }

  // ── Loading / Not found ───────────────────────────────────────────────────────

  if (loadingChofer) {
    return (
      <div className={styles.centered}>
        <Spinner color="blue" />
        <p>Cargando chofer...</p>
      </div>
    )
  }

  if (!chofer) {
    return (
      <div className={styles.centered}>
        <p className={styles.notFound}>No se encontró el chofer.</p>
        <button className={styles.backLink} onClick={() => navigate(ROUTES.ADMIN_CHOFERES)}>
          <ArrowLeft size={16} /> Volver a choferes
        </button>
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>

      {/* Back button */}
      <button className={styles.backLink} onClick={() => navigate(ROUTES.ADMIN_CHOFERES)}>
        <ArrowLeft size={16} />
        Volver a choferes
      </button>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.avatar}>
            {chofer.nombre[0]}{chofer.apellido[0]}
          </div>
          <div>
            <h1 className={styles.pageTitle}>{chofer.nombre} {chofer.apellido}</h1>
            <div className={styles.headerMeta}>
              <StatusBadge
                label={chofer.habilitado ? 'Habilitado' : 'Deshabilitado'}
                variant={chofer.habilitado ? 'success' : 'neutral'}
              />
              {chofer.tiene_deuda && (
                <StatusBadge label="Con deuda" variant="error" />
              )}
            </div>
          </div>
        </div>

        <Button
          label={chofer.habilitado ? 'Deshabilitar' : 'Habilitar'}
          variant={chofer.habilitado ? 'outline' : 'solid'}
          color={chofer.habilitado ? 'gray' : 'green'}
          size="md"
          loading={toggleHabilitadoMutation.isPending}
          disabled={toggleHabilitadoMutation.isPending}
          onClick={() => toggleHabilitadoMutation.mutate()}
        />
      </div>

      {/* ── Info + Tasa grid ────────────────────────────────────────────────── */}
      <div className={styles.grid2}>

        {/* Info card */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Información del chofer</h2>
          <div className={styles.infoGrid}>
            <InfoRow label="Email" value={chofer.email} />
            <InfoRow label="DNI" value={chofer.dni} />
            <InfoRow label="CUIL" value={chofer.cuil} />
            <InfoRow label="Teléfono" value={chofer.telefono ?? '—'} />
            <InfoRow label="Fecha de alta" value={formatDate(chofer.created_at)} />
            <InfoRow
              label="Invitación aceptada"
              value={
                chofer.invitacion_aceptada === true
                  ? 'Sí'
                  : chofer.invitacion_aceptada === false
                  ? 'No'
                  : '—'
              }
            />
          </div>
        </div>

        {/* Tasa card */}
        <div className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h2 className={styles.cardTitle}>Tasa personalizada</h2>
            {!editandoTasa && (
              <button className={styles.editBtn} onClick={abrirEditarTasa}>
                <Pencil size={14} />
                Editar tasa
              </button>
            )}
          </div>

          <div className={styles.tasaDisplay}>
            {chofer.tasa_personal != null ? (
              <>
                <span className={styles.tasaValue}>{chofer.tasa_personal}%</span>
                <span className={styles.tasaType}>Tasa personalizada</span>
              </>
            ) : (
              <>
                <span className={styles.tasaValueGlobal}>Global</span>
                <span className={styles.tasaType}>
                  Sin tasa personal — hereda la tasa global del sistema
                </span>
              </>
            )}
          </div>

          {editandoTasa && (
            <div className={styles.tasaForm}>
              <div className={styles.tasaInputGroup}>
                <div className={styles.tasaInputWrap}>
                  <input
                    type="number"
                    min={TASA_MINIMA}
                    max={100}
                    step={0.1}
                    className={`${styles.tasaInput} ${tasaError ? styles.tasaInputError : ''}`}
                    placeholder={`Ej: 4.5 (mín. ${TASA_MINIMA})`}
                    value={tasaInput}
                    onChange={(e) => { setTasaInput(e.target.value); setTasaError('') }}
                    autoFocus
                  />
                  <span className={styles.tasaInputSuffix}>%</span>
                </div>
                <div className={styles.tasaActions}>
                  <Button
                    label={tasaMutation.isPending ? 'Guardando...' : 'Guardar'}
                    variant="solid"
                    color="blue"
                    size="sm"
                    loading={tasaMutation.isPending}
                    disabled={tasaMutation.isPending}
                    onClick={guardarTasa}
                  />
                  <button className={styles.cancelTasaBtn} onClick={cancelarEditarTasa}>
                    <X size={16} />
                  </button>
                </div>
              </div>
              {tasaError && <p className={styles.tasaErrorMsg}>{tasaError}</p>}
              <p className={styles.tasaHint}>
                Dejá el campo vacío para eliminar la tasa personal y volver a la global.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Historial de adelantos ──────────────────────────────────────────── */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Historial de adelantos</h2>
        <p className={styles.cardSubtitle}>Últimos 10 adelantos solicitados</p>

        {loadingAdelantos ? (
          <div className={styles.tableLoading}><Spinner color="blue" /></div>
        ) : !adelantos || adelantos.length === 0 ? (
          <div className={styles.emptyTable}>
            <p className={styles.emptyTitle}>Sin adelantos</p>
            <p className={styles.emptyMsg}>Este chofer aún no ha solicitado adelantos.</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Fecha</th>
                  <th className={styles.th}>N° Factura</th>
                  <th className={styles.th}>Monto bruto</th>
                  <th className={styles.th}>Monto neto</th>
                  <th className={styles.th}>Tasa</th>
                  <th className={styles.th}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {adelantos.map((a) => (
                  <tr key={a.id} className={styles.tr}>
                    <td className={styles.td}>{formatDate(a.fecha_solicitud)}</td>
                    <td className={styles.td}>#{a.factura.numero_factura}</td>
                    <td className={styles.td}>{formatCurrency(a.monto_bruto)}</td>
                    <td className={styles.td}>
                      <strong style={{ color: 'var(--color-accent)' }}>
                        {formatCurrency(a.monto_neto)}
                      </strong>
                    </td>
                    <td className={styles.td}>{a.tasa_aplicada}%</td>
                    <td className={styles.td}>
                      <StatusBadge
                        label={estadoSolicitudLabel[a.estado]}
                        variant={estadoSolicitudVariant[a.estado]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Facturas ───────────────────────────────────────────────────────── */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Facturas recientes</h2>
        <p className={styles.cardSubtitle}>Últimas 10 facturas</p>

        {loadingFacturas ? (
          <div className={styles.tableLoading}><Spinner color="blue" /></div>
        ) : !facturas || facturas.length === 0 ? (
          <div className={styles.emptyTable}>
            <p className={styles.emptyTitle}>Sin facturas</p>
            <p className={styles.emptyMsg}>No hay facturas registradas para este chofer.</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>N° Factura</th>
                  <th className={styles.th}>Emisión</th>
                  <th className={styles.th}>Cobro estimado</th>
                  <th className={styles.th}>Monto bruto</th>
                  <th className={styles.th}>Monto neto</th>
                  <th className={styles.th}>Opción cobro</th>
                  <th className={styles.th}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {facturas.map((f) => (
                  <tr key={f.id} className={styles.tr}>
                    <td className={styles.td}>
                      <span style={{ fontWeight: 600 }}>#{f.numero_factura}</span>
                    </td>
                    <td className={styles.td}>{formatDate(f.fecha_emision)}</td>
                    <td className={styles.td}>{formatDate(f.fecha_cobro_estimada)}</td>
                    <td className={styles.td}>{formatCurrency(f.monto_bruto)}</td>
                    <td className={styles.td}>
                      <strong>{formatCurrency(f.monto_neto)}</strong>
                    </td>
                    <td className={styles.td}>
                      {f.opcion_cobro === 'adelanto' ? (
                        <span className={styles.badgeAdelanto}>Adelanto</span>
                      ) : (
                        <span className={styles.badgeNormal}>Normal</span>
                      )}
                    </td>
                    <td className={styles.td}>
                      <StatusBadge
                        label={estadoFacturaLabel[f.estado]}
                        variant={estadoFacturaVariant[f.estado]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}

// ─── InfoRow helper ───────────────────────────────────────────────────────────

const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className={styles.infoRow}>
    <span className={styles.infoLabel}>{label}</span>
    <span className={styles.infoValue}>{value}</span>
  </div>
)
