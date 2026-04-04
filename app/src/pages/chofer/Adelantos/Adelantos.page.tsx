import { useQuery } from '@tanstack/react-query'
import api from '@/infrastructure/interceptors/api.interceptor'
import type { SolicitudAdelanto } from '@/domain/models'
import DataTable from '@/components/DataTable/DataTable'
import { StatusBadge, estadoSolicitudLabel, estadoSolicitudVariant } from '@/components/StatusBadge/StatusBadge'
import dayjs from 'dayjs'
import styles from './Adelantos.module.css'

const formatCurrency = (n: number) =>
  n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

export const AdelantosPage = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['mis-adelantos'],
    queryFn: async () => {
      const res = await api.get<{ data: { items: SolicitudAdelanto[] } }>('/api/adelantos?page=1&limit=50')
      return res.data.data.items
    },
  })

  const columns = [
    {
      key: 'factura',
      title: 'N° Factura',
      render: (s: SolicitudAdelanto) => (
        <span style={{ fontWeight: 600 }}>#{s.factura.numero_factura}</span>
      ),
    },
    {
      key: 'monto_bruto',
      title: 'Monto bruto',
      render: (s: SolicitudAdelanto) => formatCurrency(s.monto_bruto),
    },
    {
      key: 'monto_descontado',
      title: 'Descuento',
      render: (s: SolicitudAdelanto) => (
        <span style={{ color: 'var(--color-error)' }}>
          - {formatCurrency(s.monto_descontado)}
        </span>
      ),
    },
    {
      key: 'monto_neto',
      title: 'Monto a recibir',
      render: (s: SolicitudAdelanto) => (
        <span style={{ fontWeight: 700, color: 'var(--color-accent)' }}>
          {formatCurrency(s.monto_neto)}
        </span>
      ),
    },
    {
      key: 'tasa_aplicada',
      title: 'Tasa',
      render: (s: SolicitudAdelanto) => `${s.tasa_aplicada}%`,
    },
    {
      key: 'fecha_solicitud',
      title: 'Fecha solicitud',
      render: (s: SolicitudAdelanto) => dayjs(s.fecha_solicitud).format('DD/MM/YYYY HH:mm'),
    },
    {
      key: 'estado',
      title: 'Estado',
      render: (s: SolicitudAdelanto) => (
        <div>
          <StatusBadge
            label={estadoSolicitudLabel[s.estado]}
            variant={estadoSolicitudVariant[s.estado]}
          />
          {s.estado === 'rechazada' && s.motivo_rechazo && (
            <p style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-error)',
              marginTop: 4,
              maxWidth: 200,
            }}>
              {s.motivo_rechazo}
            </p>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Adelantos</h1>
          <p className={styles.pageSubtitle}>Historial de solicitudes de adelanto</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data ?? []}
        keyExtractor={(s) => s.id}
        loading={isLoading}
        emptyTitle="Sin adelantos"
        emptyMessage="Todavía no realizaste ninguna solicitud de adelanto. Podés hacerlo desde la sección Mis Facturas."
      />
    </div>
  )
}
