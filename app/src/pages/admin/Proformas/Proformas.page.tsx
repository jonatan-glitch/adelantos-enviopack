import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, FileText, Upload } from 'lucide-react'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import * as Yup from 'yup'
import { Button } from '@enviopack/epic-ui'
import api from '@/infrastructure/interceptors/api.interceptor'
import type { Proforma, Chofer, ConfiguracionSistema } from '@/domain/models'
import DataTable from '@/components/DataTable/DataTable'
import { StatusBadge } from '@/components/StatusBadge/StatusBadge'
import dayjs from 'dayjs'
import { toast } from 'react-toastify'
import styles from './Proformas.module.css'

const formatCurrency = (n: number) =>
  n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const proformaSchema = Yup.object({
  chofer_id: Yup.number().required('El chofer es obligatorio'),
  periodo: Yup.string().required('El período es obligatorio'),
  monto: Yup.number().positive('Debe ser mayor a 0').required('El monto es obligatorio'),
  fecha_vencimiento: Yup.string().required('La fecha de vencimiento es obligatoria'),
  descripcion: Yup.string(),
})

export const ProformasPage = () => {
  const [showModal, setShowModal] = useState(false)
  const [docFile, setDocFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const qc = useQueryClient()

  const { data: proformas, isLoading } = useQuery({
    queryKey: ['admin-proformas'],
    queryFn: async () => {
      const res = await api.get<{ data: { items: Proforma[] } }>('/api/admin/proformas?page=1&limit=100')
      return res.data.data.items
    },
  })

  const { data: choferes } = useQuery({
    queryKey: ['choferes-autocomplete'],
    queryFn: async () => {
      const res = await api.get<{ data: { items: Chofer[] } }>('/api/admin/choferes?page=1&limit=200')
      return res.data.data.items
    },
  })

  const { data: config } = useQuery({
    queryKey: ['configuracion'],
    queryFn: async () => {
      const res = await api.get<{ data: ConfiguracionSistema }>('/api/configuracion')
      return res.data.data
    },
  })

  const createMutation = useMutation({
    mutationFn: (values: object) => {
      const fd = new FormData()
      Object.entries(values).forEach(([k, v]) => fd.append(k, String(v)))
      if (docFile) fd.append('documento', docFile)
      return api.post('/api/admin/proformas', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    onSuccess: () => {
      toast.success('Proforma creada. El chofer recibirá una notificación.')
      setShowModal(false)
      setDocFile(null)
      qc.invalidateQueries({ queryKey: ['admin-proformas'] })
    },
    onError: () => toast.error('Error al crear la proforma'),
  })

  const handleFileChange = (file: File | null) => {
    if (!file) return
    const allowed = ['application/pdf', 'image/jpeg', 'image/png']
    if (!allowed.includes(file.type)) {
      toast.error('Solo se permiten PDF, JPG o PNG')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('El archivo no puede superar los 10 MB')
      return
    }
    setDocFile(file)
  }

  const closeModal = () => {
    setShowModal(false)
    setDocFile(null)
  }

  const estadoBadge = (estado: Proforma['estado']) => {
    const map = {
      pendiente: { label: 'Pendiente', variant: 'warning' as const },
      facturada: { label: 'Facturada', variant: 'success' as const },
      vencida: { label: 'Vencida', variant: 'error' as const },
    }
    const { label, variant } = map[estado]
    return <StatusBadge label={label} variant={variant} />
  }

  const columns = [
    {
      key: 'chofer',
      title: 'Chofer',
      render: (p: Proforma) => (
        <div>
          <p style={{ fontWeight: 600 }}>{p.chofer.nombre} {p.chofer.apellido}</p>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)' }}>DNI {p.chofer.dni}</p>
        </div>
      ),
    },
    { key: 'periodo', title: 'Período', render: (p: Proforma) => p.periodo },
    { key: 'monto', title: 'Monto', render: (p: Proforma) => formatCurrency(p.monto) },
    { key: 'tasa_aplicada', title: 'Tasa', render: (p: Proforma) => `${p.tasa_aplicada}%` },
    {
      key: 'fecha_vencimiento',
      title: 'Vencimiento',
      render: (p: Proforma) => dayjs(p.fecha_vencimiento).format('DD/MM/YYYY'),
    },
    { key: 'estado', title: 'Estado', render: (p: Proforma) => estadoBadge(p.estado) },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Proformas</h1>
          <p className={styles.pageSubtitle}>Cargá las proformas para que los choferes puedan facturar</p>
        </div>
        <Button
          label="Nueva proforma"
          icon="plus-linear"
          variant="solid"
          color="blue"
          size="md"
          onClick={() => setShowModal(true)}
        />
      </div>

      <DataTable
        columns={columns}
        data={proformas ?? []}
        keyExtractor={(p) => p.id}
        loading={isLoading}
        emptyTitle="Sin proformas"
        emptyMessage="Cargá la primera proforma para un chofer."
      />

      {showModal && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Nueva proforma</h3>
              <button className={styles.closeBtn} onClick={closeModal}>
                <X size={18} />
              </button>
            </div>

            <Formik
              initialValues={{
                chofer_id: '',
                periodo: '',
                monto: '',
                fecha_vencimiento: dayjs().add(30, 'day').format('YYYY-MM-DD'),
                descripcion: '',
              }}
              validationSchema={proformaSchema}
              onSubmit={(values) => createMutation.mutate({
                ...values,
                tasa_aplicada: config?.tasa_global ?? 3,
              })}
            >
              {({ isSubmitting }) => (
                <Form>
                  <div className={styles.modalBody}>
                    {/* Chofer */}
                    <div className={styles.field}>
                      <label className={styles.label}>Chofer *</label>
                      <Field as="select" name="chofer_id" className={styles.input}>
                        <option value="">Seleccioná un chofer...</option>
                        {choferes?.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nombre} {c.apellido} — DNI {c.dni}
                          </option>
                        ))}
                      </Field>
                      <ErrorMessage name="chofer_id" component="p" className={styles.error} />
                    </div>

                    {/* Período + Monto */}
                    <div className={styles.row2}>
                      <div className={styles.field}>
                        <label className={styles.label}>Período *</label>
                        <Field name="periodo" className={styles.input} placeholder="Ej: Marzo 2026 Q1" />
                        <ErrorMessage name="periodo" component="p" className={styles.error} />
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label}>Monto *</label>
                        <Field name="monto" type="number" className={styles.input} placeholder="0" />
                        <ErrorMessage name="monto" component="p" className={styles.error} />
                      </div>
                    </div>

                    {/* Vencimiento + Tasa */}
                    <div className={styles.row2}>
                      <div className={styles.field}>
                        <label className={styles.label}>Fecha de vencimiento *</label>
                        <Field name="fecha_vencimiento" type="date" className={styles.input} />
                        <ErrorMessage name="fecha_vencimiento" component="p" className={styles.error} />
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label}>Tasa aplicada</label>
                        <input
                          type="text"
                          className={styles.input}
                          value={`${config?.tasa_global ?? 3}% (global)`}
                          disabled
                        />
                      </div>
                    </div>

                    {/* Descripción */}
                    <div className={styles.field}>
                      <label className={styles.label}>Descripción</label>
                      <Field
                        as="textarea"
                        name="descripcion"
                        className={styles.textarea}
                        rows={2}
                        placeholder="Descripción del servicio prestado..."
                      />
                    </div>

                    {/* Documento de referencia */}
                    <div className={styles.field}>
                      <label className={styles.label}>
                        Documento de referencia
                        <span style={{ fontWeight: 400, color: 'var(--color-gray-400)', marginLeft: 6 }}>
                          (opcional)
                        </span>
                      </label>

                      {docFile ? (
                        <div className={styles.fileSelected}>
                          <FileText size={18} color="var(--color-accent)" style={{ flexShrink: 0 }} />
                          <span className={styles.fileSelectedName}>{docFile.name}</span>
                          <span className={styles.fileSelectedSize}>{formatBytes(docFile.size)}</span>
                          <button
                            type="button"
                            className={styles.fileRemoveBtn}
                            onClick={() => setDocFile(null)}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div
                          className={`${styles.fileDropZone} ${dragOver ? styles.fileDropZoneActive : ''}`}
                          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                          onDragLeave={() => setDragOver(false)}
                          onDrop={(e) => {
                            e.preventDefault()
                            setDragOver(false)
                            handleFileChange(e.dataTransfer.files[0] ?? null)
                          }}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            className={styles.fileInput}
                            onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className={styles.fileIcon}>
                            <Upload size={24} />
                          </div>
                          <p className={styles.fileDropText}>
                            Arrastrá el archivo o hacé clic para seleccionar
                          </p>
                          <p className={styles.fileDropSubtext}>PDF, JPG o PNG — máx. 10 MB</p>
                        </div>
                      )}
                      <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)', marginTop: 2 }}>
                        El chofer podrá descargar este documento para emitir su factura.
                      </p>
                    </div>

                    <p className={styles.notaInfo}>
                      Al crear la proforma, el chofer recibirá una notificación por email.
                    </p>
                  </div>

                  <div className={styles.modalFooter}>
                    <Button
                      type="button"
                      label="Cancelar"
                      variant="outline"
                      color="gray"
                      onClick={closeModal}
                    />
                    <Button
                      type="submit"
                      label={createMutation.isPending ? 'Creando...' : 'Crear proforma'}
                      variant="solid"
                      color="blue"
                      loading={createMutation.isPending}
                      disabled={isSubmitting || createMutation.isPending}
                    />
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        </div>
      )}
    </div>
  )
}
