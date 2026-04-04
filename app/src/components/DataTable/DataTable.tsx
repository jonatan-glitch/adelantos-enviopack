import { Spinner } from '@enviopack/epic-ui'
import styles from './DataTable.module.css'

interface Column<T> {
  key: string
  title: string
  render?: (row: T) => React.ReactNode
  width?: string
}

interface Props<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (row: T) => string | number
  loading?: boolean
  emptyTitle?: string
  emptyMessage?: string
  onRowClick?: (row: T) => void
}

function DataTable<T>({
  columns,
  data,
  keyExtractor,
  loading,
  emptyTitle = 'Sin datos',
  emptyMessage = 'No hay registros para mostrar.',
  onRowClick,
}: Props<T>) {
  if (loading) {
    return (
      <div className={styles.loading}>
        <Spinner color="blue" />
        <p>Cargando...</p>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>{emptyTitle}</p>
        <p className={styles.emptyMessage}>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={{ width: col.width }} className={styles.th}>
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={keyExtractor(row)}
              className={`${styles.tr} ${onRowClick ? styles.clickable : ''}`}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <td key={col.key} className={styles.td}>
                  {col.render
                    ? col.render(row)
                    : String((row as Record<string, unknown>)[col.key] ?? '-')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default DataTable
