import { useQuery } from '@tanstack/react-query'
import { FileText } from 'lucide-react'
import { MetricCard } from '@enviopack/epic-ui'
import api from '@/infrastructure/interceptors/api.interceptor'
import type { DashboardChofer, Factura } from '@/domain/models'
import { StatusBadge, estadoFacturaLabel, estadoFacturaVariant } from '@/components/StatusBadge/StatusBadge'
import { useAppSelector } from '@/hooks/useAppSelector'
import dayjs from 'dayjs'
import styles from './Dashboard.module.css'

const formatCurrency = (n: number) =>
  n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

export const DashboardPage = () => {
  const profile = useAppSelector((s) => s.profile)

  const { data: stats } = useQuery({
    queryKey: ['dashboard-chofer'],
    queryFn: async () => {
      const res = await api.get<{ data: DashboardChofer }>('/api/dashboard')
      return res.data.data
    },
  })

  const { data: facturas } = useQuery({
    queryKey: ['facturas-recientes'],
    queryFn: async () => {
      const res = await api.get<{ data: { items: Factura[] } }>('/api/facturas?limit=5&page=1')
      return res.data.data.items
    },
  })

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>
            Hola, {profile?.nombre ?? 'bienvenido'} 👋
          </h1>
          <p className={styles.pageSubtitle}>
            {dayjs().format('dddd, D [de] MMMM [de] YYYY')}
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className={styles.kpiGrid}>
        <MetricCard
          title="Facturas disponibles"
          value={stats?.facturas_disponibles ?? 0}
          icon="paper-linear"
          variantIcon="info"
        />
        <MetricCard
          title="Adelantos pendientes"
          value={stats?.adelantos_pendientes ?? 0}
          icon="card-linear"
          variantIcon="warning"
        />
        <MetricCard
          title="Total facturado"
          value={formatCurrency(stats?.total_facturado ?? 0)}
          icon="cash-lineal"
          variantIcon="success"
        />
        <MetricCard
          title="Total adelantado"
          value={formatCurrency(stats?.total_adelantado ?? 0)}
          icon="percent-linear"
          variantIcon="base"
        />
      </div>

      {/* Recent invoices */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Mis últimas facturas</h2>
        {facturas && facturas.length > 0 ? (
          <div className={styles.facturasList}>
            {facturas.map((f) => (
              <div key={f.id} className={styles.facturaRow}>
                <div className={styles.facturaInfo}>
                  <p className={styles.facturaNum}>Factura #{f.numero_factura}</p>
                  <p className={styles.facturaDate}>
                    Vence el {dayjs(f.fecha_cobro_estimada).format('DD/MM/YYYY')}
                  </p>
                </div>
                <div className={styles.facturaRight}>
                  <p className={styles.facturaMonto}>{formatCurrency(f.monto_bruto)}</p>
                  <StatusBadge
                    label={estadoFacturaLabel[f.estado]}
                    variant={estadoFacturaVariant[f.estado]}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <FileText size={32} color="var(--color-gray-300)" />
            <p>No tenés facturas disponibles aún.</p>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-400)' }}>
              El equipo de administración cargará tus proformas pronto.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

