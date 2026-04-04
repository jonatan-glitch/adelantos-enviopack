import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, ClipboardList } from 'lucide-react'
import api from '@/infrastructure/interceptors/api.interceptor'
import type { SolicitudAdelanto, EstadoSolicitud } from '@/domain/models'
import DataTable from '@/components/DataTable/DataTable'
import {
  StatusBadge,
  estadoSolicitudLabel,
  estadoSolicitudVariant,
} from '@/components/StatusBadge/StatusBadge'
import dayjs from 'dayjs'
import styles from './Historial.module.css'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatCurrency = (n: number) =>
  n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

const ESTADO_OPTIONS: { value: '' | EstadoSolicitud; label: string }[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'en_revision', label: 'En revisión' },
  { value: 'aprobada', label: 'Aprobada' },
  { value: 'rechazada', label: 'Rechazada' },
  { value: 'pagada', label: 'Pagada' },
]

// ─── Table columns ────────────────────────────────────────────────────────────

const buildColumns = () => [
  {
    key: 'fecha_solicitud',
    title: 'Fecha solicitud',
    render: (s: SolicitudAdelanto) =>
      dayjs(s.fecha_solicitud).format('DD/MM/YYYY HH:mm'),
  },
  {
    key: 'factura',
    title: 'N° Factura',
    render: (s: SolicitudAdelanto) => (
      <span className={styles.facturaNum}>#{s.factura.numero_factura}</span>
    ),
  },
  {
    key: 'monto_bruto',
    title: 'Monto solicitado',
    render: (s: SolicitudAdelanto) => formatCurrency(s.monto_bruto),
  },
  {
    key: 'monto_neto',
    title: 'Monto aprobado',
    render: (s: SolicitudAdelanto) =>
      s.monto_neto > 0 ? (
        <span className={styles.montoAprobado}>{formatCurrency(s.monto_neto)}</span>
      ) : (
        <span className={styles.dash}>—</span>
      ),
  },
  {
    key: 'tasa_aplicada',
    title: 'Tasa aplicada',
    render: (s: SolicitudAdelanto) =>
      s.tasa_aplicada != null ? `${s.tasa_aplicada}%` : <span className={styles.dash}>—</span>,
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
          <p className={styles.motivoRechazo}>{s.motivo_rechazo}</p>
        )}
      </div>
    ),
  },
  {
    key: 'fecha_pago',
    title: 'Fecha pago',
    render: (s: SolicitudAdelanto) =>
      s.fecha_pago ? (
        dayjs(s.fecha_pago).format('DD/MM/YYYY')
      ) : (
        <span className={styles.dash}>—</span>
      ),
  },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export const HistorialPage = () => {
  const thisMonthStart = dayjs().startOf('month').format('YYYY-MM-DD')
  const today = dayjs().format('YYYY-MM-DD')

  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [estado, setEstado] = useState<'' | EstadoSolicitud>('')

  // Build query params
  const params = useMemo(() => {
    const p = new URLSearchParams({ page: '1', limit: '200' })
    if (desde) p.set('fecha_desde', desde)
    if (hasta) p.set('fecha_hasta', hasta)
    if (estado) p.set('estado', estado)
    return p.toString()
  }, [desde, hasta, estado])

  const { data, isLoading } = useQuery({
    queryKey: ['historial-adelantos', params],
    queryFn: async () => {
      const res = await api.get<{ data: { items: SolicitudAdelanto[] } }>(
        `/api/adelantos/historial?${params}`,
      )
      return res.data.data.items
    },
  })

  // Summary cards — computed from full dataset (no date filter applied to summary)
  const { data: summaryData } = useQuery({
    queryKey: ['historial-adelantos-summary'],
    queryFn: async () => {
      const p = new URLSearchParams({ page: '1', limit: '1000' })
      const res = await api.get<{ data: { items: SolicitudAdelanto[] } }>(
        `/api/adelantos/historial?${p.toString()}`,
      )
      return res.data.data.items
    },
  })

  const summary = useMemo(() => {
    const all = summaryData ?? []
    const thisMonth = all.filter((s) =>
      dayjs(s.fecha_solicitud).isSame(dayjs(), 'month'),
    )

    const totalSolicitado = thisMonth.reduce((acc, s) => acc + s.monto_bruto, 0)
    const totalAprobado = thisMonth
      .filter((s) => s.estado === 'aprobada' || s.estado === 'pagada')
      .reduce((acc, s) => acc + s.monto_neto, 0)
    const totalPagado = thisMonth
      .filter((s) => s.estado === 'pagada')
      .reduce((acc, s) => acc + s.monto_neto, 0)

    return { totalSolicitado, totalAprobado, totalPagado }
  }, [summaryData])

  const columns = useMemo(() => buildColumns(), [])

  const handleExport = () => {
    // Placeholder: build a CSV from current data and trigger download
    if (!data || data.length === 0) return
    const headers = [
      'Fecha solicitud',
      'N° Factura',
      'Monto solicitado',
      'Monto aprobado',
      'Tasa aplicada',
      'Estado',
      'Fecha pago',
    ]
    const rows = data.map((s) => [
      dayjs(s.fecha_solicitud).format('DD/MM/YYYY HH:mm'),
      `#${s.factura.numero_factura}`,
      s.monto_bruto,
      s.monto_neto > 0 ? s.monto_neto : '',
      s.tasa_aplicada != null ? `${s.tasa_aplicada}%` : '',
      estadoSolicitudLabel[s.estado],
      s.fecha_pago ? dayjs(s.fecha_pago).format('DD/MM/YYYY') : '',
    ])
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `historial-adelantos-${dayjs().format('YYYYMMDD')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const hasFilters = !!(desde || hasta || estado)

  const clearFilters = () => {
    setDesde('')
    setHasta('')
    setEstado('')
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Historial de adelantos</h1>
          <p className={styles.pageSubtitle}>
            Registro completo de todas tus solicitudes de adelanto
          </p>
        </div>
        <button
          className={styles.exportBtn}
          onClick={handleExport}
          disabled={!data || data.length === 0}
          title="Exportar a CSV"
        >
          <Download size={16} />
          Exportar
        </button>
      </div>

      {/* Summary cards */}
      <div className={styles.summaryGrid}>
        <SummaryCard
          label="Solicitado este mes"
          value={formatCurrency(summary.totalSolicitado)}
          colorClass={styles.cardBlue}
        />
        <SummaryCard
          label="Aprobado este mes"
          value={formatCurrency(summary.totalAprobado)}
          colorClass={styles.cardGreen}
        />
        <SummaryCard
          label="Pagado este mes"
          value={formatCurrency(summary.totalPagado)}
          colorClass={styles.cardPurple}
        />
      </div>

      {/* Filters */}
      <div className={styles.filtersBar}>
        <div className={styles.filtersLeft}>
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Desde</label>
            <input
              type="date"
              className={styles.dateInput}
              value={desde}
              max={hasta || today}
              onChange={(e) => setDesde(e.target.value)}
            />
          </div>
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Hasta</label>
            <input
              type="date"
              className={styles.dateInput}
              value={hasta}
              min={desde || undefined}
              max={today}
              onChange={(e) => setHasta(e.target.value)}
            />
          </div>
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Estado</label>
            <select
              className={styles.selectInput}
              value={estado}
              onChange={(e) => setEstado(e.target.value as '' | EstadoSolicitud)}
            >
              {ESTADO_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {hasFilters && (
          <button className={styles.clearBtn} onClick={clearFilters}>
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={data ?? []}
        keyExtractor={(s) => s.id}
        loading={isLoading}
        emptyTitle="Sin registros"
        emptyMessage={
          hasFilters
            ? 'No hay adelantos que coincidan con los filtros seleccionados. Probá ajustando el rango de fechas o el estado.'
            : 'Todavía no realizaste ninguna solicitud de adelanto.'
        }
      />

      {/* Record count */}
      {!isLoading && data && data.length > 0 && (
        <p className={styles.recordCount}>
          {data.length} {data.length === 1 ? 'registro' : 'registros'}
          {hasFilters ? ' con los filtros aplicados' : ' en total'}
        </p>
      )}
    </div>
  )
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

interface SummaryCardProps {
  label: string
  value: string
  colorClass: string
}

const SummaryCard = ({ label, value, colorClass }: SummaryCardProps) => (
  <div className={`${styles.summaryCard} ${colorClass}`}>
    <p className={styles.summaryLabel}>{label}</p>
    <p className={styles.summaryValue}>{value}</p>
  </div>
)
