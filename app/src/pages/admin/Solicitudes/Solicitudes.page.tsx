import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, AlertCircle } from 'lucide-react'
import { Button } from '@enviopack/epic-ui'
import api from '@/infrastructure/interceptors/api.interceptor'
import type { SolicitudAdelanto } from '@/domain/models'
import DataTable from '@/components/DataTable/DataTable'
import { StatusBadge, estadoSolicitudLabel, estadoSolicitudVariant } from '@/components/StatusBadge/StatusBadge'
import dayjs from 'dayjs'
import { toast } from 'react-toastify'
import styles from './Solicitudes.module.css'

const formatCurrency = (n: number) =>
  n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

export const SolicitudesPage = () => {
  const [estadoFilter, setEstadoFilter] = useState<string>('en_revision')
  const [rechazarModal, setRechazarModal] = useState<SolicitudAdelanto | null>(null)
  const [pagoModal, setPagoModal] = useState<SolicitudAdelanto | null>(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-solicitudes', estadoFilter],
    queryFn: async () => {
      const params = estadoFilter ? `estado=${estadoFilter}&` : ''
      const res = await api.get<{ data: { items: SolicitudAdelanto[] } }>(
        `/api/admin/solicitudes?${params}page=1&limit=100`
      )
      return res.data.data.items
    },
  })

  const aprobarMutation = useMutation({
    mutationFn: (id: number) => api.put(`/api/admin/solicitudes/${id}/aprobar`),
    onSuccess: () => {
      toast.success('Solicitud aprobada')
      qc.invalidateQueries({ queryKey: ['admin-solicitudes'] })
    },
    onError: () => toast.error('Error al aprobar'),
  })

  const columns = [
    {
      key: 'chofer',
      title: 'Proveedor',
      render: (s: SolicitudAdelanto) => (
        <div>
          <p style={{ fontWeight: 600 }}>{s.chofer.nombre} {s.chofer.apellido}</p>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)' }}>
            DNI {s.chofer.dni}
          </p>
        </div>
      ),
    },
    {
      key: 'factura',
      title: 'N° Factura',
      render: (s: SolicitudAdelanto) => `#${s.factura.numero_factura}`,
    },
    {
      key: 'monto_bruto',
      title: 'Monto bruto',
      render: (s: SolicitudAdelanto) => formatCurrency(s.monto_bruto),
    },
    {
      key: 'monto_neto',
      title: 'Monto neto',
      render: (s: SolicitudAdelanto) => (
        <strong style={{ color: 'var(--color-accent)' }}>{formatCurrency(s.monto_neto)}</strong>
      ),
    },
    {
      key: 'tasa_aplicada',
      title: 'Tasa',
      render: (s: SolicitudAdelanto) => `${s.tasa_aplicada}%`,
    },
    {
      key: 'tipo_aprobacion',
      title: 'Tipo',
      render: (s: SolicitudAdelanto) =>
        s.tipo_aprobacion === 'automatica'
          ? <span className={styles.badgeAuto}>Automática</span>
          : <span className={styles.badgeManual}>Manual</span>,
    },
    {
      key: 'fecha_solicitud',
      title: 'Solicitud',
      render: (s: SolicitudAdelanto) => dayjs(s.fecha_solicitud).format('DD/MM HH:mm'),
    },
    {
      key: 'estado',
      title: 'Estado',
      render: (s: SolicitudAdelanto) => (
        <StatusBadge
          label={estadoSolicitudLabel[s.estado]}
          variant={estadoSolicitudVariant[s.estado]}
        />
      ),
    },
    {
      key: 'acciones',
      title: 'Acciones',
      render: (s: SolicitudAdelanto) => (
        <div style={{ display: 'flex', gap: 6 }}>
          {s.estado === 'en_revision' && (
            <>
              <Button
                label="Aprobar"
                icon="check-linear"
                variant="solid"
                color="green"
                size="sm"
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); aprobarMutation.mutate(s.id) }}
              />
              <Button
                label="Rechazar"
                icon="cross-linear"
                variant="solid"
                color="red"
                size="sm"
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); setRechazarModal(s) }}
              />
            </>
          )}
          {s.estado === 'aprobada' && (
            <Button
              label="Registrar pago"
              icon="archive-up-arrow-linear"
              variant="solid"
              color="blue"
              size="sm"
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); setPagoModal(s) }}
            />
          )}
          {s.estado === 'aprobada' && (
            <Button
              label="Rechazar"
              icon="cross-linear"
              variant="solid"
              color="red"
              size="sm"
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); setRechazarModal(s) }}
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
          <h1 className={styles.pageTitle}>Gestión de solicitudes</h1>
          <p className={styles.pageSubtitle}>Revisá y gestioná las solicitudes de adelanto</p>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        {(['', 'en_revision', 'aprobada', 'rechazada', 'pagada'] as const).map((estado) => (
          <button
            key={estado}
            className={`${styles.filterTab} ${estadoFilter === estado ? styles.filterTabActive : ''}`}
            onClick={() => setEstadoFilter(estado)}
          >
            {estado === '' ? 'Todas' : estadoSolicitudLabel[estado as keyof typeof estadoSolicitudLabel] ?? estado}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={data ?? []}
        keyExtractor={(s) => s.id}
        loading={isLoading}
        emptyTitle="Sin solicitudes"
        emptyMessage="No hay solicitudes que coincidan con el filtro seleccionado."
      />

      {rechazarModal && (
        <RechazarModal
          solicitud={rechazarModal}
          onClose={() => setRechazarModal(null)}
          onSuccess={() => {
            setRechazarModal(null)
            qc.invalidateQueries({ queryKey: ['admin-solicitudes'] })
          }}
        />
      )}

      {pagoModal && (
        <RegistrarPagoModal
          solicitud={pagoModal}
          onClose={() => setPagoModal(null)}
          onSuccess={() => {
            setPagoModal(null)
            qc.invalidateQueries({ queryKey: ['admin-solicitudes'] })
          }}
        />
      )}
    </div>
  )
}

// ── Rechazar Modal ────────────────────────────────────────────────────────────

const RechazarModal = ({
  solicitud,
  onClose,
  onSuccess,
}: { solicitud: SolicitudAdelanto; onClose: () => void; onSuccess: () => void }) => {
  const [motivo, setMotivo] = useState('')

  const mutation = useMutation({
    mutationFn: () => api.put(`/api/admin/solicitudes/${solicitud.id}/rechazar`, { motivo }),
    onSuccess: () => { toast.success('Solicitud rechazada'); onSuccess() },
    onError: () => toast.error('Error al rechazar'),
  })

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Rechazar solicitud</h3>
          <button className={styles.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>
        <div className={styles.modalBody}>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)' }}>
            {solicitud.chofer.nombre} {solicitud.chofer.apellido} — #{solicitud.factura.numero_factura} — {formatCurrency(solicitud.monto_neto)}
          </p>
          <div>
            <label className={styles.fieldLabel}>Motivo del rechazo *</label>
            <textarea
              className={styles.textarea}
              placeholder="Ingresá el motivo del rechazo..."
              rows={4}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>
          <div className={styles.alertWarning}>
            <AlertCircle size={16} />
            <p>El motivo será visible para el chofer.</p>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <Button label="Cancelar" variant="outline" color="gray" onClick={onClose} />
          <Button
            label={mutation.isPending ? 'Rechazando...' : 'Confirmar rechazo'}
            variant="solid"
            color="red"
            loading={mutation.isPending}
            disabled={!motivo.trim() || mutation.isPending}
            onClick={() => mutation.mutate()}
          />
        </div>
      </div>
    </div>
  )
}

// ── Registrar Pago Modal ──────────────────────────────────────────────────────

const RegistrarPagoModal = ({
  solicitud,
  onClose,
  onSuccess,
}: { solicitud: SolicitudAdelanto; onClose: () => void; onSuccess: () => void }) => {
  const [file, setFile] = useState<File | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Debe adjuntar el comprobante de pago.')

      // Step 1: Upload comprobante file
      const fd = new FormData()
      fd.append('comprobante', file)
      const uploadRes = await api.post(`/api/admin/solicitudes/${solicitud.id}/comprobante`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const comprobanteUrl = uploadRes.data?.data?.comprobante_url ?? null

      // Step 2: Register payment with comprobante URL
      await api.put(`/api/admin/solicitudes/${solicitud.id}/registrar-pago`, {
        comprobante_url: comprobanteUrl,
      })
    },
    onSuccess: () => { toast.success('Pago registrado correctamente. El proveedor fue notificado por email.'); onSuccess() },
    onError: () => toast.error('Error al registrar el pago'),
  })

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Registrar pago</h3>
          <button className={styles.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.resumen}>
            <div className={styles.resumenRow}>
              <span>Proveedor</span>
              <strong>{solicitud.chofer.nombre} {solicitud.chofer.apellido}</strong>
            </div>
            <div className={styles.resumenRow}>
              <span>Monto a pagar</span>
              <strong style={{ color: 'var(--color-accent)', fontSize: 'var(--font-size-lg)' }}>
                {formatCurrency(solicitud.monto_neto)}
              </strong>
            </div>
          </div>
          <div>
            <label className={styles.fieldLabel}>Comprobante de pago (PDF/imagen) *</label>
            <input
              type="file"
              accept=".pdf,image/*"
              className={styles.fileInput}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file && <p className={styles.fileName}>✓ {file.name}</p>}
          </div>
        </div>
        <div className={styles.modalFooter}>
          <Button label="Cancelar" variant="outline" color="gray" onClick={onClose} />
          <Button
            label={mutation.isPending ? 'Registrando...' : 'Registrar pago'}
            variant="solid"
            color="blue"
            loading={mutation.isPending}
            disabled={!file || mutation.isPending}
            onClick={() => mutation.mutate()}
          />
        </div>
      </div>
    </div>
  )
}
