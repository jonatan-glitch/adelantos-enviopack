import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, CheckCircle, AlertCircle, CreditCard, FileText } from 'lucide-react'
import { Button } from '@enviopack/epic-ui'
import api from '@/infrastructure/interceptors/api.interceptor'
import type { Factura, Proforma } from '@/domain/models'
import DataTable from '@/components/DataTable/DataTable'
import { StatusBadge, estadoFacturaLabel, estadoFacturaVariant } from '@/components/StatusBadge/StatusBadge'
import dayjs from 'dayjs'
import { toast } from 'react-toastify'
import styles from './Facturas.module.css'

const formatCurrency = (n: number) =>
  n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

export const FacturasPage = () => {
  const [selectedProforma, setSelectedProforma] = useState<Proforma | null>(null)
  const [adelantoModal, setAdelantoModal] = useState<Factura | null>(null)
  const qc = useQueryClient()

  // Fetch chofer's proformas
  const { data: proformas, isLoading: loadingProformas } = useQuery({
    queryKey: ['mis-proformas'],
    queryFn: async () => {
      const res = await api.get<{ data: { items: Proforma[] } }>('/api/proformas?limit=50&page=1')
      return res.data.data.items
    },
  })

  // Fetch chofer's facturas
  const { data: facturas, isLoading: loadingFacturas } = useQuery({
    queryKey: ['mis-facturas'],
    queryFn: async () => {
      const res = await api.get<{ data: { items: Factura[] } }>('/api/facturas?limit=50&page=1')
      return res.data.data.items
    },
  })

  const pendientes = proformas?.filter((p) => p.estado === 'pendiente') ?? []

  const proformaColumns = [
    { key: 'periodo', title: 'Período', render: (p: Proforma) => <strong>{p.periodo}</strong> },
    { key: 'monto', title: 'Monto', render: (p: Proforma) => formatCurrency(p.monto) },
    { key: 'tasa', title: 'Tasa', render: (p: Proforma) => `${p.tasa_aplicada}%` },
    {
      key: 'vencimiento', title: 'Vencimiento',
      render: (p: Proforma) => dayjs(p.fecha_vencimiento).format('DD/MM/YYYY'),
    },
    {
      key: 'accion', title: '',
      render: (p: Proforma) => (
        <Button
          label="Cargar factura"
          icon="archive-up-arrow-linear"
          variant="solid"
          color="blue"
          size="sm"
          onClick={(e: React.MouseEvent) => { e.stopPropagation(); setSelectedProforma(p) }}
        />
      ),
    },
  ]

  const facturaColumns = [
    {
      key: 'numero_factura', title: 'N° Factura',
      render: (f: Factura) => <span style={{ fontWeight: 600 }}>#{f.numero_factura}</span>,
    },
    { key: 'monto_bruto', title: 'Monto bruto', render: (f: Factura) => formatCurrency(f.monto_bruto) },
    {
      key: 'monto_neto', title: 'Monto neto',
      render: (f: Factura) => (
        <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{formatCurrency(f.monto_neto)}</span>
      ),
    },
    {
      key: 'opcion_cobro', title: 'Tipo cobro',
      render: (f: Factura) => f.opcion_cobro === 'adelanto'
        ? <StatusBadge label="Adelanto 48hs" variant="info" />
        : <StatusBadge label="Normal 30 días" variant="default" />,
    },
    {
      key: 'estado', title: 'Estado',
      render: (f: Factura) => <StatusBadge label={estadoFacturaLabel[f.estado]} variant={estadoFacturaVariant[f.estado]} />,
    },
    {
      key: 'acciones', title: '',
      render: (f: Factura) => (
        f.estado === 'pendiente_cobro' && f.archivo_factura_url && (
          <Button
            label="Solicitar adelanto"
            icon="card-linear"
            variant="outline"
            color="blue"
            size="sm"
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); setAdelantoModal(f) }}
          />
        )
      ),
    },
  ]

  return (
    <div className={styles.page}>
      {/* Pending proformas */}
      {pendientes.length > 0 && (
        <>
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>Proformas pendientes</h1>
              <p className={styles.pageSubtitle}>
                Elegí cómo querés cobrar y cargá tu factura
              </p>
            </div>
          </div>

          <DataTable
            columns={proformaColumns}
            data={pendientes}
            keyExtractor={(p) => p.id}
            loading={loadingProformas}
            emptyTitle=""
            emptyMessage=""
          />

          <div style={{ height: 40 }} />
        </>
      )}

      {/* Existing facturas */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Mis Facturas</h1>
          <p className={styles.pageSubtitle}>Todas tus facturas con su estado actual</p>
        </div>
      </div>

      <DataTable
        columns={facturaColumns}
        data={facturas ?? []}
        keyExtractor={(f) => f.id}
        loading={loadingFacturas}
        emptyTitle="Sin facturas"
        emptyMessage={pendientes.length > 0
          ? 'Cargá tu primera factura desde las proformas pendientes arriba.'
          : 'El equipo de administración aún no ha cargado proformas para vos.'
        }
      />

      {/* Upload Invoice from Proforma Modal */}
      {selectedProforma && (
        <UploadFacturaModal
          proforma={selectedProforma}
          onClose={() => setSelectedProforma(null)}
          onSuccess={() => {
            setSelectedProforma(null)
            qc.invalidateQueries({ queryKey: ['mis-proformas'] })
            qc.invalidateQueries({ queryKey: ['mis-facturas'] })
            toast.success('Factura cargada correctamente')
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
            toast.success('Solicitud enviada. Te notificaremos sobre su estado.')
          }}
        />
      )}
    </div>
  )
}

// ── Upload Factura from Proforma ──────────────────────────────────────────────

interface UploadModalProps {
  proforma: Proforma
  onClose: () => void
  onSuccess: () => void
}

const UploadFacturaModal = ({ proforma, onClose, onSuccess }: UploadModalProps) => {
  const [opcion, setOpcion] = useState<'normal' | 'adelanto'>('normal')
  const [fileFactura, setFileFactura] = useState<File | null>(null)
  const [fileNC, setFileNC] = useState<File | null>(null)
  const [numeroFactura, setNumeroFactura] = useState('')
  const [montoFactura, setMontoFactura] = useState(String(proforma.monto))
  const [montoNC, setMontoNC] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const descuento = opcion === 'adelanto'
    ? Number(montoFactura) * (proforma.tasa_aplicada / 100)
    : 0
  const montoNeto = Number(montoFactura) - descuento

  const handleSubmit = async () => {
    if (!fileFactura || !numeroFactura) return
    if (opcion === 'adelanto' && !fileNC) return

    setSubmitting(true)
    let step = ''
    try {
      // Step 1: Create factura (JSON)
      step = 'crear factura'
      const res = await api.post('/api/facturas', {
        numero_factura: numeroFactura,
        monto_bruto: Number(montoFactura),
        monto_nota_credito: opcion === 'adelanto' ? descuento : null,
        fecha_emision: dayjs().format('YYYY-MM-DD'),
        proforma_id: proforma.id,
      })
      const facturaId = res.data?.data?.id ?? res.data?.id
      if (!facturaId) {
        console.error('Factura response:', JSON.stringify(res.data))
        throw new Error('No se obtuvo ID de factura')
      }

      // Step 2: Upload factura file
      step = 'subir archivo factura'
      const fdFactura = new FormData()
      fdFactura.append('archivo', fileFactura)
      await api.post(`/api/facturas/${facturaId}/archivo`, fdFactura, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      // Step 3: Upload nota de crédito (if adelanto)
      if (opcion === 'adelanto' && fileNC) {
        step = 'subir nota de crédito'
        const fdNC = new FormData()
        fdNC.append('archivo', fileNC)
        await api.post(`/api/facturas/${facturaId}/nota-credito`, fdNC, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      }

      // Step 4: Confirm payment option + transition estado (JSON)
      step = 'confirmar opción de cobro'
      await api.put(`/api/facturas/${facturaId}/confirmar`, {
        opcion_cobro: opcion,
        monto_nota_credito: opcion === 'adelanto' ? descuento : null,
      })

      onSuccess()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      console.error(`Error en paso "${step}":`, err)
      toast.error(`Error al ${step}: ${msg}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Cargar factura" onClose={onClose}>
      <div className={styles.modalBody}>
        <div className={styles.resumen}>
          <div className={styles.resumenRow}>
            <span>Proforma</span>
            <strong>{proforma.periodo}</strong>
          </div>
          <div className={styles.resumenRow}>
            <span>Monto</span>
            <strong>{formatCurrency(proforma.monto)}</strong>
          </div>
          <div className={styles.resumenRow}>
            <span>Vencimiento</span>
            <strong>{dayjs(proforma.fecha_vencimiento).format('DD/MM/YYYY')}</strong>
          </div>
        </div>

        {/* Payment option */}
        <div className={styles.opcionGroup}>
          <p className={styles.fieldLabel}>¿Cómo querés cobrar?</p>
          <div className={styles.opcionCards}>
            <button
              className={`${styles.opcionCard} ${opcion === 'normal' ? styles.opcionActive : ''}`}
              onClick={() => setOpcion('normal')}
              type="button"
            >
              <CheckCircle size={20} />
              <div>
                <p className={styles.opcionTitle}>Cobro normal</p>
                <p className={styles.opcionDesc}>Total en 30 días</p>
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
                <p className={styles.opcionDesc}>En 48hs hábiles con {proforma.tasa_aplicada}% desc.</p>
              </div>
            </button>
          </div>
        </div>

        {opcion === 'adelanto' && (
          <div className={styles.alertInfo}>
            <AlertCircle size={16} />
            <p>Debes cargar la factura por el total y una nota de crédito por el descuento.</p>
          </div>
        )}

        {/* Factura number */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Número de factura *</label>
          <input
            type="text"
            className={styles.input}
            placeholder="Ej: 0001-00001234"
            value={numeroFactura}
            onChange={(e) => setNumeroFactura(e.target.value)}
          />
        </div>

        {/* Monto */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Monto de la factura *</label>
          <input
            type="number"
            className={styles.input}
            value={montoFactura}
            onChange={(e) => setMontoFactura(e.target.value)}
          />
        </div>

        {/* Factura file */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Archivo de factura (PDF/imagen) *</label>
          <input
            type="file"
            accept=".pdf,image/*"
            className={styles.fileInput}
            onChange={(e) => setFileFactura(e.target.files?.[0] ?? null)}
          />
          {fileFactura && <p className={styles.fileName}>✓ {fileFactura.name}</p>}
        </div>

        {/* NC file — only for adelanto */}
        {opcion === 'adelanto' && (
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Nota de Crédito (PDF/imagen) *</label>
            <input
              type="file"
              accept=".pdf,image/*"
              className={styles.fileInput}
              onChange={(e) => setFileNC(e.target.files?.[0] ?? null)}
            />
            {fileNC && <p className={styles.fileName}>✓ {fileNC.name}</p>}
          </div>
        )}

        {/* Summary */}
        {opcion === 'adelanto' && Number(montoFactura) > 0 && (
          <div className={styles.montoNeto}>
            <p>Descuento ({proforma.tasa_aplicada}%): <strong>-{formatCurrency(descuento)}</strong></p>
            <p>Monto a recibir en 48hs: <strong>{formatCurrency(montoNeto)}</strong></p>
          </div>
        )}

        {opcion === 'normal' && Number(montoFactura) > 0 && (
          <div className={styles.montoNeto}>
            <p>Monto a recibir en 30 días: <strong>{formatCurrency(Number(montoFactura))}</strong></p>
          </div>
        )}
      </div>

      <div className={styles.modalFooter}>
        <Button label="Cancelar" variant="outline" color="gray" onClick={onClose} />
        <Button
          label={submitting ? 'Enviando...' : 'Enviar factura'}
          variant="solid"
          color="blue"
          loading={submitting}
          disabled={submitting || !fileFactura || !numeroFactura || (opcion === 'adelanto' && !fileNC)}
          onClick={handleSubmit}
        />
      </div>
    </Modal>
  )
}

// ── Solicitar Adelanto Modal ──────────────────────────────────────────────────

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

// ── Generic Modal ─────────────────────────────────────────────────────────────

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
