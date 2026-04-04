import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Download, TrendingUp, DollarSign, Users, Percent, CreditCard, Clock } from 'lucide-react'
import api from '@/infrastructure/interceptors/api.interceptor'
import type { DashboardAdmin } from '@/domain/models'
import { toast } from 'react-toastify'
import styles from './Reportes.module.css'

const formatCurrency = (n: number) =>
  n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

export const ReportesPage = () => {
  const [periodo, setPeriodo] = useState('mes_actual')

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-admin', periodo],
    queryFn: async () => {
      const res = await api.get<{ data: DashboardAdmin }>(`/api/admin/dashboard?periodo=${periodo}`)
      return res.data.data
    },
  })

  const handleExport = async () => {
    try {
      const response = await api.get(`/api/admin/reportes/exportar?periodo=${periodo}`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `reporte-adelantos-${periodo}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch {
      toast.error('Error al exportar el reporte')
    }
  }

  const kpis = [
    {
      title: 'Monto total facturado',
      value: formatCurrency(stats?.monto_total_facturado ?? 0),
      icon: <DollarSign size={20} />,
      color: 'blue',
    },
    {
      title: 'Descuentos obtenidos',
      value: formatCurrency(stats?.descuentos_obtenidos ?? 0),
      icon: <TrendingUp size={20} />,
      color: 'green',
    },
    {
      title: 'Choferes totales',
      value: stats?.choferes_total ?? 0,
      icon: <Users size={20} />,
      color: 'purple',
    },
    {
      title: 'Choferes con adelanto',
      value: stats?.choferes_con_adelanto ?? 0,
      icon: <CreditCard size={20} />,
      color: 'orange',
    },
    {
      title: 'Tasa promedio',
      value: `${stats?.tasa_promedio?.toFixed(1) ?? 0}%`,
      icon: <Percent size={20} />,
      color: 'blue',
    },
    {
      title: 'Tiempo promedio aprobación',
      value: `${stats?.tiempo_promedio_aprobacion_horas?.toFixed(1) ?? 0}hs`,
      icon: <Clock size={20} />,
      color: 'purple',
    },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Reportes y métricas</h1>
          <p className={styles.pageSubtitle}>Indicadores clave del módulo de adelantos</p>
        </div>
        <div className={styles.headerActions}>
          <select
            className={styles.periodoSelect}
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
          >
            <option value="mes_actual">Mes actual</option>
            <option value="mes_anterior">Mes anterior</option>
            <option value="trimestre">Último trimestre</option>
            <option value="anio">Año en curso</option>
          </select>
          <button className={styles.exportBtn} onClick={handleExport}>
            <Download size={16} />
            Exportar Excel
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className={styles.loading}>Cargando métricas...</div>
      ) : (
        <div className={styles.kpiGrid}>
          {kpis.map((kpi) => (
            <div key={kpi.title} className={`${styles.kpiCard} ${styles[`kpi_${kpi.color}`]}`}>
              <div className={styles.kpiIcon}>{kpi.icon}</div>
              <div>
                <p className={styles.kpiTitle}>{kpi.title}</p>
                <p className={styles.kpiValue}>{kpi.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
