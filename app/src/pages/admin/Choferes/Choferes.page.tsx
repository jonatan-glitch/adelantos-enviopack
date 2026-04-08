import { useState, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import * as Yup from 'yup'
import { X, Upload, Download, FileText, Search } from 'lucide-react'
import { Button } from '@enviopack/epic-ui'
import { toast } from 'react-toastify'
import api from '@/infrastructure/interceptors/api.interceptor'
import type { Chofer } from '@/domain/models'
import DataTable from '@/components/DataTable/DataTable'
import { StatusBadge } from '@/components/StatusBadge/StatusBadge'
import styles from './Choferes.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CsvRow {
  nombre: string
  apellido: string
  dni: string
  cuil: string
  email: string
  telefono?: string
  tasa_personal?: string
}

interface ParsedRow {
  raw: CsvRow
  errors: string[]
  isValid: boolean
}

// ─── Validation ───────────────────────────────────────────────────────────────

const inviteSchema = Yup.object({
  email: Yup.string()
    .email('El email no es válido')
    .required('El email es obligatorio'),
})

const REQUIRED_FIELDS: (keyof CsvRow)[] = ['nombre', 'apellido', 'dni', 'cuil', 'email']

function validateCsvRow(row: Record<string, string>): ParsedRow {
  const errors: string[] = []

  for (const field of REQUIRED_FIELDS) {
    if (!row[field]?.trim()) {
      errors.push(`"${field}" requerido`)
    }
  }

  if (row.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email.trim())) {
    errors.push('email inválido')
  }

  if (row.tasa_personal?.trim()) {
    const n = parseFloat(row.tasa_personal)
    if (isNaN(n) || n <= 0 || n > 100) {
      errors.push('tasa debe ser 0–100')
    }
  }

  return {
    raw: {
      nombre: row.nombre?.trim() ?? '',
      apellido: row.apellido?.trim() ?? '',
      dni: row.dni?.trim() ?? '',
      cuil: row.cuil?.trim() ?? '',
      email: row.email?.trim() ?? '',
      telefono: row.telefono?.trim() || undefined,
      tasa_personal: row.tasa_personal?.trim() || undefined,
    },
    errors,
    isValid: errors.length === 0,
  }
}

// ─── CSV parser (no external dependencies) ────────────────────────────────────

function parseCsv(text: string): ParsedRow[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ''))

  return lines
    .slice(1)
    .map((line) => {
      const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''))
      const row: Record<string, string> = {}
      headers.forEach((h, i) => { row[h] = values[i] ?? '' })
      return validateCsvRow(row)
    })
    .filter((r) => Object.values(r.raw).some((v) => v !== '' && v !== undefined))
}

// ─── Template download (pure client-side) ─────────────────────────────────────

function downloadTemplate() {
  const header = 'nombre,apellido,dni,cuil,email,telefono,tasa_personal'
  const example = 'Juan,Perez,12345678,20-12345678-9,juan@ejemplo.com,1112345678,3.5'
  const blob = new Blob([`${header}\n${example}\n`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'plantilla_choferes.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Page ──────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export const ChoferesPage = () => {
  const navigate = useNavigate()
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-choferes'],
    queryFn: async () => {
      const res = await api.get<{ data: { items: Chofer[] } }>('/api/admin/choferes?page=1&limit=100')
      return res.data.data.items
    },
  })

  const filteredData = useMemo(() => {
    const sorted = [...(data ?? [])].sort((a, b) =>
      `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`, 'es', { sensitivity: 'base' })
    )
    if (!search.trim()) return sorted
    const q = search.toLowerCase().trim()
    return sorted.filter((c) =>
      `${c.nombre} ${c.apellido} ${c.email} ${c.dni} ${c.cuil}`.toLowerCase().includes(q)
    )
  }, [data, search])

  const columns = [
    {
      key: 'nombre',
      title: 'Nombre',
      render: (c: Chofer) => (
        <div>
          <p style={{ fontWeight: 600 }}>{c.nombre} {c.apellido}</p>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)' }}>
            {c.email}
          </p>
        </div>
      ),
    },
    { key: 'dni', title: 'DNI', render: (c: Chofer) => c.dni },
    { key: 'cuil', title: 'CUIT/CUIL', render: (c: Chofer) => c.cuil },
    {
      key: 'tasa_personal',
      title: 'Tasa personal',
      render: (c: Chofer) =>
        c.tasa_personal
          ? `${c.tasa_personal}%`
          : <span style={{ color: 'var(--color-gray-400)' }}>Global</span>,
    },
    {
      key: 'tiene_deuda',
      title: 'Deudas',
      render: (c: Chofer) =>
        c.tiene_deuda
          ? <StatusBadge label="Con deuda" variant="error" />
          : <StatusBadge label="Sin deuda" variant="success" />,
    },
    {
      key: 'habilitado',
      title: 'Estado',
      render: (c: Chofer) =>
        c.habilitado
          ? <StatusBadge label="Habilitado" variant="success" />
          : <StatusBadge label="Deshabilitado" variant="neutral" />,
    },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Choferes</h1>
          <p className={styles.pageSubtitle}>Gestión de choferes registrados en la plataforma</p>
        </div>

        <div className={styles.headerActions}>
          <Button
            label="Importar CSV"
            icon="import-linear"
            variant="outline"
            color="gray"
            size="md"
            onClick={() => setShowImportModal(true)}
          />
          <Button
            label="Invitar chofer"
            icon="user-linear"
            variant="solid"
            color="blue"
            size="md"
            onClick={() => setShowInviteModal(true)}
          />
        </div>
      </div>

      <div className={styles.searchBar}>
        <Search size={16} className={styles.searchIcon} />
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Buscar por nombre, apellido, email, DNI o CUIT..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className={styles.searchClear} onClick={() => setSearch('')} aria-label="Limpiar">
            <X size={14} />
          </button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={filteredData}
        keyExtractor={(c) => c.id}
        loading={isLoading}
        emptyTitle={search ? 'Sin resultados' : 'Sin choferes'}
        emptyMessage={search ? `No se encontraron choferes para "${search}".` : 'Invitá al primer chofer o importá la nómina desde un CSV.'}
        onRowClick={(c) => navigate(`/admin/choferes/${c.id}`)}
      />

      {showInviteModal && (
        <InviteModal onClose={() => setShowInviteModal(false)} />
      )}

      {showImportModal && (
        <ImportCsvModal onClose={() => setShowImportModal(false)} />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Modal 1: Invitar por email ─────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

const InviteModal = ({ onClose }: { onClose: () => void }) => {
  const inviteMutation = useMutation({
    mutationFn: (values: { email: string }) =>
      api.post('/api/admin/choferes/invitar', values),
    onSuccess: () => {
      toast.success('Invitación enviada. El chofer recibirá un email para completar su registro.')
      onClose()
    },
    onError: () => toast.error('No se pudo enviar la invitación. Intentá de nuevo.'),
  })

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Invitar chofer</h3>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <Formik
          initialValues={{ email: '' }}
          validationSchema={inviteSchema}
          onSubmit={(values) => inviteMutation.mutate(values)}
        >
          <Form>
            <div className={styles.modalBody}>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)', lineHeight: 1.6 }}>
                El chofer recibirá un email con un enlace para completar su propio registro: nombre, DNI, CUIT y contraseña.
              </p>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="invite-email">
                  Email del chofer *
                </label>
                <Field
                  id="invite-email"
                  name="email"
                  type="email"
                  className={styles.input}
                  placeholder="chofer@ejemplo.com"
                  autoFocus
                />
                <ErrorMessage name="email" component="p" className={styles.error} />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <Button
                type="button"
                label="Cancelar"
                variant="outline"
                color="gray"
                onClick={onClose}
              />
              <Button
                type="submit"
                label={inviteMutation.isPending ? 'Enviando...' : 'Enviar invitación'}
                variant="solid"
                color="blue"
                loading={inviteMutation.isPending}
                disabled={inviteMutation.isPending}
              />
            </div>
          </Form>
        </Formik>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Modal 2: Importar CSV ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

const ImportCsvModal = ({ onClose }: { onClose: () => void }) => {
  const [parsedRows, setParsedRows] = useState<ParsedRow[] | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const qc = useQueryClient()

  const validRows = parsedRows?.filter((r) => r.isValid) ?? []
  const invalidRows = parsedRows?.filter((r) => !r.isValid) ?? []

  const importMutation = useMutation({
    mutationFn: () =>
      api.post('/api/admin/choferes/importar', {
        choferes: validRows.map((r) => r.raw),
      }),
    onSuccess: (res) => {
      const created: number =
        (res.data as { data?: { creados?: number } })?.data?.creados ?? validRows.length
      toast.success(
        `${created} ${created === 1 ? 'chofer importado' : 'choferes importados'} correctamente.`,
      )
      qc.invalidateQueries({ queryKey: ['admin-choferes'] })
      onClose()
    },
    onError: () => toast.error('Error al importar. Revisá el archivo e intentá de nuevo.'),
  })

  const processFile = (file: File | null | undefined) => {
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      toast.error('Solo se aceptan archivos .csv')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('El archivo no puede superar los 5 MB')
      return
    }

    setFileName(file.name)

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const rows = parseCsv(text)
      if (rows.length === 0) {
        toast.error('El archivo no tiene filas de datos. Revisá el formato con la plantilla.')
        setParsedRows(null)
        setFileName(null)
        return
      }
      setParsedRows(rows)
    }
    reader.readAsText(file, 'UTF-8')
  }

  const resetFile = () => {
    setParsedRows(null)
    setFileName(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const importLabel = importMutation.isPending
    ? 'Importando...'
    : parsedRows
    ? `Importar ${validRows.length} ${validRows.length === 1 ? 'chofer' : 'choferes'}`
    : 'Importar'

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={`${styles.modal} ${styles.modalWide}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Importar choferes desde CSV</h3>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>

          {/* Hint + template download */}
          <div className={styles.templateHint}>
            Columnas requeridas: <strong>nombre, apellido, dni, cuil, email</strong>.
            Opcionales: <strong>telefono, tasa_personal</strong>.{' '}
            <button type="button" className={styles.templateLink} onClick={downloadTemplate}>
              <Download size={13} />
              Descargar plantilla .csv
            </button>
          </div>

          {/* Step A: drop zone (visible until file is loaded) */}
          {!parsedRows ? (
            <div className={styles.field}>
              <label className={styles.label}>Seleccioná el archivo CSV</label>
              <div
                className={`${styles.fileDropZone} ${dragOver ? styles.fileDropZoneActive : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragOver(false)
                  processFile(e.dataTransfer.files[0])
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className={styles.fileInput}
                  onChange={(e) => processFile(e.target.files?.[0])}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className={styles.fileIcon}>
                  <Upload size={30} />
                </div>
                <p className={styles.fileDropText}>Arrastrá o hacé clic para seleccionar</p>
                <p className={styles.fileDropSubtext}>Solo .csv — máx. 5 MB</p>
              </div>
            </div>
          ) : (
            /* Step B: preview */
            <>
              {/* File name + change link */}
              <div className={styles.fileSelectedBar}>
                <div className={styles.fileSelectedName}>
                  <FileText size={16} color="var(--color-accent)" />
                  {fileName}
                </div>
                <button type="button" className={styles.templateLink} onClick={resetFile}>
                  Cambiar archivo
                </button>
              </div>

              {/* Summary */}
              <div className={styles.previewSummary}>
                <span>Total: <strong>{parsedRows.length}</strong></span>
                <span className={styles.summaryValid}>✓ Válidas: {validRows.length}</span>
                {invalidRows.length > 0 && (
                  <span className={styles.summaryInvalid}>✗ Con errores: {invalidRows.length}</span>
                )}
              </div>

              {/* Preview table */}
              <div className={styles.previewWrapper}>
                <table className={styles.previewTable}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Nombre</th>
                      <th>Apellido</th>
                      <th>DNI</th>
                      <th>CUIL</th>
                      <th>Email</th>
                      <th>Teléfono</th>
                      <th>Tasa</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((row, i) => (
                      <tr key={i} className={row.isValid ? undefined : styles.rowInvalid}>
                        <td>{i + 1}</td>
                        <td>{row.raw.nombre || <span style={{ color: 'var(--color-error)' }}>—</span>}</td>
                        <td>{row.raw.apellido || <span style={{ color: 'var(--color-error)' }}>—</span>}</td>
                        <td>{row.raw.dni || <span style={{ color: 'var(--color-error)' }}>—</span>}</td>
                        <td>{row.raw.cuil || <span style={{ color: 'var(--color-error)' }}>—</span>}</td>
                        <td>{row.raw.email || <span style={{ color: 'var(--color-error)' }}>—</span>}</td>
                        <td>{row.raw.telefono ?? <span style={{ color: 'var(--color-gray-300)' }}>—</span>}</td>
                        <td>
                          {row.raw.tasa_personal
                            ? `${row.raw.tasa_personal}%`
                            : <span style={{ color: 'var(--color-gray-300)' }}>Global</span>}
                        </td>
                        <td className={styles.cellError}>
                          {row.isValid
                            ? <span style={{ color: '#15803D', fontWeight: 600 }}>✓ OK</span>
                            : row.errors.join(' · ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Warning when some rows are invalid */}
              {invalidRows.length > 0 && validRows.length > 0 && (
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)' }}>
                  Las <strong>{invalidRows.length}</strong> filas con errores serán ignoradas.
                  Solo se importarán las <strong>{validRows.length}</strong> válidas.
                </p>
              )}

              {/* All rows invalid */}
              {validRows.length === 0 && (
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-error)', fontWeight: 500 }}>
                  No hay filas válidas para importar. Corregí el archivo y volvé a subirlo.
                </p>
              )}
            </>
          )}
        </div>

        <div className={styles.modalFooter}>
          <Button
            type="button"
            label="Cancelar"
            variant="outline"
            color="gray"
            onClick={onClose}
          />
          <Button
            type="button"
            label={importLabel}
            variant="solid"
            color="blue"
            loading={importMutation.isPending}
            disabled={!parsedRows || validRows.length === 0 || importMutation.isPending}
            onClick={() => importMutation.mutate()}
          />
        </div>
      </div>
    </div>
  )
}
