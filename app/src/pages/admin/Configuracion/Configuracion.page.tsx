import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { Settings, Mail, Clock, Percent } from 'lucide-react'
import api from '@/infrastructure/interceptors/api.interceptor'
import type { ConfiguracionSistema } from '@/domain/models'
import { toast } from 'react-toastify'
import { TASA_MINIMA } from '@/domain/constants'
import styles from './Configuracion.module.css'

export const ConfiguracionPage = () => {
  const qc = useQueryClient()

  const { data: config } = useQuery({
    queryKey: ['configuracion'],
    queryFn: async () => {
      const res = await api.get<{ data: ConfiguracionSistema }>('/api/admin/configuracion')
      return res.data.data
    },
  })

  const mutation = useMutation({
    mutationFn: (values: ConfiguracionSistema) => api.put('/api/admin/configuracion', values),
    onSuccess: () => {
      toast.success('Configuración guardada correctamente')
      qc.invalidateQueries({ queryKey: ['configuracion'] })
    },
    onError: () => toast.error('Error al guardar la configuración'),
  })

  const [tasa, setTasa] = useState('')
  const [dias, setDias] = useState('')
  const [plazo, setPlazo] = useState('')
  const [emails, setEmails] = useState('')

  useEffect(() => {
    if (config) {
      setTasa(String(config.tasa_global ?? TASA_MINIMA))
      setDias(String(config.dias_cobro_normal ?? 30))
      setPlazo(String(config.plazo_acreditacion_horas ?? 48))
      setEmails((config.emails_notificacion_admin ?? []).join(', '))
    }
  }, [config])

  const handleSave = () => {
    const tasaNum = parseFloat(tasa)
    const diasNum = parseInt(dias) || 30
    const plazoNum = parseInt(plazo) || 48

    if (isNaN(tasaNum) || tasaNum < TASA_MINIMA) {
      toast.error(`La tasa mínima es ${TASA_MINIMA}%`)
      return
    }
    if (diasNum < 1) {
      toast.error('Los días de cobro normal deben ser al menos 1')
      return
    }
    if (plazoNum < 1) {
      toast.error('El plazo de acreditación debe ser al menos 1 hora')
      return
    }

    mutation.mutate({
      tasa_global: tasaNum,
      dias_cobro_normal: diasNum,
      plazo_acreditacion_horas: plazoNum,
      emails_notificacion_admin: emails.split(',').map((e) => e.trim()).filter(Boolean),
    })
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <Settings size={24} color="var(--color-primary)" />
        <div>
          <h1 className={styles.pageTitle}>Configuración</h1>
          <p className={styles.pageSubtitle}>Parámetros globales del sistema de adelantos</p>
        </div>
      </div>

      <div className={styles.sections}>
        {/* Tasa y plazos */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <Percent size={18} color="var(--color-accent)" />
            <h2 className={styles.cardTitle}>Tasa y plazos</h2>
          </div>

          <div className={styles.fields}>
            <div className={styles.field}>
              <label className={styles.label}>Tasa global de descuento (%)</label>
              <p className={styles.hint}>Mínimo {TASA_MINIMA}%. Aplica a todas las nuevas proformas.</p>
              <input
                type="number"
                min={TASA_MINIMA}
                step="0.5"
                className={styles.input}
                value={tasa}
                onChange={(e) => setTasa(e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Días para cobro normal</label>
              <p className={styles.hint}>Plazo en días desde la emisión de la factura (por defecto 30).</p>
              <input
                type="number"
                min={1}
                className={styles.input}
                value={dias}
                onChange={(e) => setDias(e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>
                <Clock size={14} /> Plazo de acreditación de adelantos (horas hábiles)
              </label>
              <p className={styles.hint}>Por defecto 48 horas hábiles.</p>
              <input
                type="number"
                min={1}
                className={styles.input}
                value={plazo}
                onChange={(e) => setPlazo(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Notificaciones */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <Mail size={18} color="var(--color-accent)" />
            <h2 className={styles.cardTitle}>Notificaciones</h2>
          </div>

          <div className={styles.fields}>
            <div className={styles.field}>
              <label className={styles.label}>Emails de administración</label>
              <p className={styles.hint}>
                Estos emails recibirán notificaciones cuando un proveedor suba una factura.
                Separados por coma.
              </p>
              <textarea
                className={styles.textarea}
                rows={3}
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                placeholder="admin@enviopack.com, finanzas@enviopack.com"
              />
            </div>
          </div>
        </section>

        {/* Save button */}
        <div className={styles.saveRow}>
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Guardando...' : 'Guardar configuración'}
          </button>
        </div>
      </div>
    </div>
  )
}
