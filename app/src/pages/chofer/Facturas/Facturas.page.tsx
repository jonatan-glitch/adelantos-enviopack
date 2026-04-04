import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@enviopack/epic-ui'
import api from '@/infrastructure/interceptors/api.interceptor'
import type { Factura } from '@/domain/models'
import DataTable from '@/components/DataTable/DataTable'
import { StatusBadge, estadoFacturaLabel, estadoFacturaVariant } from '@/components/StatusBadge/StatusBadge'
import dayjs from 'dayjs'
import { toast } from 'react-toastify'
import styles from './Facturas.module.css'

const formatCurrency = (n: number) =>
  n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

export const FacturasPage = () => {
  const [uploadModal, setUploadModal] = useState<Factura | null>(null)
  const [adelantoModal, setAdelantoModal] = useState<Factura | null>(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['mis-facturas'],
    queryFn: async () => {
      const res = await api.get<{ data: { items: Factura[] } }>('/api/facturas?limit=50&page=1')
      return res.data.data.items
    },
  })

  const columns = [
    {
      key: 'numero_factura',
      title: 'N° Factura',
      render: (f: Factura) => (
        <span style={{ fontWeight: 600, color: 'var(--color-gray-800)' }}>
          #{f.numero_factura}
        </span>
      ),
    },
    {
      key: 'monto_bruto',
      title: 'Monto bruto',
      render: (f: Factura) => formatCurrency(f.monto_bruto),
    },
    {
      key: 'monto_neto',
      title: 'Monto neto',
      render: (f: Factura) => (
        <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
          {formatCurrency(f.monto_neto)}
        </span>
      ),
    },
    {
      key: 'fecha_emision',
      title: 'Fecha emisión',
      render: (f: Factura) => dayjs(f.fecha_emision).format('DD/MM/YYYY'),
    },
    {
      key: 'fecha_cobro_estimada',
      title: 'Fecha cobro',
      render: (f: Factura) => dayjs(f.fecha_cobro_estimada).format('DD/MM/YYYY'),
    },
    {
      key: 'estado',
      title: 'Estado',
      render: (f: Factura) => (
        <StatusBadge
          label={estadoFacturaLabel[f.estado]}
          variant={estadoFacturaVariant[f.estado]}
        />
      ),
    },
    {
      key: 'acciones',
      title: 'Acciones',
      render: (f: Factura) => (
        <div style={{ display: 'flex', gap: 8 }}>
          {f.estado === 'pendiente_cobro' && !f.archivo_factura_url && (
            <Button
              label="Subir factura"
              icon="archive-up-arrow-linear"
              variant="outline"
              color="blue"
              size="sm"
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); setUploadModal(f) }}
            />
          )}
          {f.estado === 'pendiente_cobro' && f.archivo_factura_url && (
            <Button
              label="Solicitar adelanto"
              icon="card-linear"
              variant="solid"
              color="blue"
              size="sm"
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); setAdelantoModal(f) }}
            />
          )}
        </div>
      ),
    },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Mis Facturas</h1>
          <p className={styles.pageSubtitle}>
            Todas tus facturas con su estado actual
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data ?? []}
        keyExtractor={(f) => f.id}
        loading={isLoading}
        emptyTitle="Sin facturas disponibles"
        emptyMessage="El equipo de administración aún no ha cargado proformas para vos."
      />

      {/* Upload Invoice Modal */}
      {uploadModal && (
        <UploadFacturaModal
          factura={uploadModal}
          onClose={() => setUploadModal(null)}
          onSuccess={() => {
            setUploadModal(null)
            qc.invalidateQueries({ queryKey: ['mis-facturas'] })
            toast.success('Factura subida correctamente')
          }}
        />
      )}

      {/* Request Advance Modal */}
      {adelantoModal && (
        <SolicitarAdelantoModal
          factura={adelantoModal}
          onClose={() => setAdelantoModal(null)}
          onSuccess={() => {
            setAdelantoModal(null)
            qc.invalidateQueries({ queryKey: ['mis-facturas'] })
            toast.success('Solicitud enviada correctamente. Te notificaremos sobre su estado.')
          }}
        />
      )}
    </div>
  )
}

// ── Upload Modal ───────────────────────────────────────────────────────────────

interface UploadModalProps {
  factura: Factura
  onClose: () => void
  onSuccess: () => void
}

const UploadFacturaModal = ({ factura, onClose, onSuccess }: UploadModalProps) => {
  const [opcion, setOpcion] = useState<'normal' | 'adelanto'>('normal')
  const [fileFactura, setFileFactura] = useState<File | null>(null)
  const [fileNC, setFileNC] = useState<File | null>(null)
  const [montoFactura, setMontoFactura] = useState('')
  const [montoNC, setMontoNC] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const montoNeto = opcion === 'adelanto' && montoFactura && montoNC
    ? Number(montoFactura) - Number(montoNC)
    : null

  const handleSubmit = async () => {
    if (!fileFactura) return
    if (opcion === 'adelanto' && !fileNC) return

    setSubmitting(true)
    try {
      const form = new FormData()
      form.append('factura_id', String(factura.id))
      form.append('opcion_cobro', opcion)
      form.append('archivo_factura', fileFactura)
      form.append('monto_factura', montoFactura)
      if (opcion === 'adelanto' && fileNC) {
        form.append('archivo_nota_credito', fileNC)
        form.append('monto_nota_credito', montoNC)
      }
      await api.post('/api/facturas/subir', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      onSuccess()
    } catch {
      toast.error('Error al subir la factura. Intentá de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Subir factura" onClose={onClose}>
      <div className={styles.modalBody}>
        <p className={styles.modalSubtitle}>
          Proforma #{factura.proforma?.id} — {formatCurrency(factura.monto_bruto)}
        </p>

        {/* Payment option */}
        <div className={styles.opcionGroup}>
          <p className={styles.fieldLabel}>Opción de cobro</p>
          <div className={styles.opcionCards}>
            <button
              className={`${styles.opcionCard} ${opcion === 'normal' ? styles.opcionActive : ''}`}
              onClick={() => setOpcion('normal')}
              type="button"
            >
              <CheckCircle size={20} />
              <div>
                <p className={styles.opcionTitle}>Cobro normal</p>
                <p className={styles.opcionDesc}>Cobrás el total en {factura.proforma ? '30' : '30'} días</p>
              </div>
            </button>
            <button
              className={`${styles.opcionCard} ${opcion === 'adelanto' ? styles.opcionActive : ''}`}
              onClick={() => setOpcion('adelanto')}
              type="button"
            >
              <CreditCard size={20} />
              <div>
                <p className={styles.opcionTitle}>Cobro adelantado</p>
                <p className={styles.opcionDesc}>Cobrás en 48hs con un descuento</p>
              </div>
            </button>
          </div>
        </div>

        {/* Factura file */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>
            Factura (PDF) *
          </label>
          <input
            type="number"
            className={styles.input}
            placeholder="Monto de la factura"
            value={montoFactura}
            onChange={(e) => setMontoFactura(e.target.value)}
          />
          <input
            type="file"
            accept=".pdf,image/*"
            className={styles.fileInput}
            onChange={(e) => setFileFactura(e.target.files?.[0] ?? null)}
          />
          {fileFactura && (
            <p className={styles.fileName}>✓ {fileFactura.name}</p>
          )}
        </div>

        {/* NC file — only for adelanto */}
        {opcion === 'adelanto' && (
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              Nota de Crédito (PDF) *
            </label>
            <input
              type="number"
              className={styles.input}
              placeholder="Monto de la nota de crédito"
              value={montoNC}
              onChange={(e) => setMontoNC(e.target.value)}
            />
            <input
              type="file"
              accept=".pdf,image/*"
              className={styles.fileInput}
              onChange={(e) => setFileNC(e.target.files?.[0] ?? null)}
            />
            {fileNC && <p className={styles.fileName}>✓ {fileNC.name}</p>}

            {montoNeto !== null && montoNeto > 0 && (
              <div className={styles.montoNeto}>
                <p>Monto a recibir: <strong>{formatCurrency(montoNeto)}</strong></p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className={styles.modalFooter}>
        <Button label="Cancelar" variant="outline" color="gray" onClick={onClose} />
        <Button
          label={submitting ? 'Enviando...' : 'Enviar'}
          variant="solid"
          color="blue"
          loading={submitting}
          disabled={submitting || !fileFactura || (opcion === 'adelanto' && !fileNC)}
          onClick={handleSubmit}
        />
      </div>
    </Modal>
  )
}

// ── Solicitar Adelanto Modal ───────────────────────────────────────────────────

interface AdelantoModalProps {
  factura: Factura
  onClose: () => void
  onSuccess: () => void
}

const SolicitarAdelantoModal = ({ factura, onClose, onSuccess }: AdelantoModalProps) => {
  const [consented, setConsented] = useState(false)
  const mutation = useMutation({
    mutationFn: () => api.post('/api/adelantos', { factura_id: factura.id, consentimiento: true }),
    onSuccess,
    onError: () => toast.error('Error al enviar la solicitud'),
  })

  return (
    <Modal title="Solicitar adelanto" onClose={onClose}>
      <div className={styles.modalBody}>
        <div className={styles.resumen}>
          <div className={styles.resumenRow}>
            <span>Monto bruto</span>
            <strong>{formatCurrency(factura.monto_bruto)}</strong>
          </div>
          <div className={styles.resumenRow}>
            <span>Nota de crédito</span>
            <strong className={styles.descuento}>- {formatCurrency(factura.monto_nota_credito ?? 0)}</strong>
          </div>
          <div className={`${styles.resumenRow} ${styles.resumenTotal}`}>
            <span>Monto a recibir</span>
            <strong>{formatCurrency(factura.monto_neto)}</strong>
          </div>
          <div className={styles.resumenRow}>
            <span>Plazo estimado</span>
            <strong>48 horas hábiles</strong>
          </div>
        </div>

        <div className={styles.alertInfo}>
          <AlertCircle size={16} />
          <p>Una vez enviada, la solicitud pasará a revisión. Te notificaremos sobre su estado.</p>
        </div>

        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={consented}
            onChange={(e) => setConsented(e.target.checked)}
          />
          Acepto los términos de esta operación de adelanto de factura.
        </label>
      </div>

      <div className={styles.modalFooter}>
        <Button label="Cancelar" variant="outline" color="gray" onClick={onClose} />
        <Button
          label={mutation.isPending ? 'Enviando...' : 'Confirmar solicitud'}
          variant="solid"
          color="blue"
          loading={mutation.isPending}
          disabled={!consented || mutation.isPending}
          onClick={() => mutation.mutate()}
        />
      </div>
    </Modal>
  )
}

// ── Generic Modal ──────────────────────────────────────────────────────────────

const Modal = ({
  title,
  children,
  onClose,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
}) => (
  <div className={styles.overlay} onClick={onClose}>
    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
      <div className={styles.modalHeader}>
        <h3 className={styles.modalTitle}>{title}</h3>
        <button className={styles.closeBtn} onClick={onClose}><X size={18} /></button>
      </div>
      {children}
    </div>
  </div>
)
