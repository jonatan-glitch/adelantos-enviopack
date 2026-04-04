import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import * as Yup from 'yup'
import { User, Phone, Lock, Building2, CheckCircle2, AlertCircle, Pencil, X } from 'lucide-react'
import api from '@/infrastructure/interceptors/api.interceptor'
import type { PerfilChofer } from '@/domain/models'
import styles from './Perfil.module.css'

// ─── Validation schemas ───────────────────────────────────────────────────────

const telefonoSchema = Yup.object({
  telefono: Yup.string()
    .matches(/^[0-9+\-\s()]{6,20}$/, 'Ingresá un número de teléfono válido')
    .required('El teléfono es obligatorio'),
})

const passwordSchema = Yup.object({
  contrasena_actual: Yup.string().required('Ingresá tu contraseña actual'),
  nueva_contrasena: Yup.string()
    .min(8, 'Mínimo 8 caracteres')
    .matches(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .matches(/[0-9]/, 'Debe contener al menos un número')
    .required('Ingresá la nueva contraseña'),
  confirmar_contrasena: Yup.string()
    .oneOf([Yup.ref('nueva_contrasena')], 'Las contraseñas no coinciden')
    .required('Confirmá la nueva contraseña'),
})

// ─── Alert component ──────────────────────────────────────────────────────────

type AlertType = 'success' | 'error'

interface AlertProps {
  type: AlertType
  message: string
}

const Alert = ({ type, message }: AlertProps) => (
  <div className={`${styles.alert} ${styles[`alert_${type}`]}`}>
    {type === 'success'
      ? <CheckCircle2 size={16} />
      : <AlertCircle size={16} />
    }
    <span>{message}</span>
  </div>
)

// ─── Field row (read-only) ────────────────────────────────────────────────────

interface InfoRowProps {
  label: string
  value: string | undefined | null
}

const InfoRow = ({ label, value }: InfoRowProps) => (
  <div className={styles.infoRow}>
    <span className={styles.infoLabel}>{label}</span>
    <span className={styles.infoValue}>{value ?? <span className={styles.infoEmpty}>No informado</span>}</span>
  </div>
)

// ─── Main page ────────────────────────────────────────────────────────────────

export const PerfilPage = () => {
  const queryClient = useQueryClient()
  const [editingPhone, setEditingPhone] = useState(false)
  const [phoneAlert, setPhoneAlert] = useState<AlertProps | null>(null)
  const [passwordAlert, setPasswordAlert] = useState<AlertProps | null>(null)

  // Fetch profile
  const { data: perfil, isLoading } = useQuery<PerfilChofer>({
    queryKey: ['chofer-perfil'],
    queryFn: async () => {
      const res = await api.get<{ data: PerfilChofer }>('/api/chofer/perfil')
      return res.data.data
    },
  })

  // Update phone mutation
  const updatePhone = useMutation({
    mutationFn: async (telefono: string) => {
      await api.put('/api/chofer/perfil', { telefono })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chofer-perfil'] })
      setEditingPhone(false)
      setPhoneAlert({ type: 'success', message: 'Teléfono actualizado correctamente.' })
      setTimeout(() => setPhoneAlert(null), 4000)
    },
    onError: () => {
      setPhoneAlert({ type: 'error', message: 'No se pudo actualizar el teléfono. Intentá de nuevo.' })
    },
  })

  // Change password mutation
  const changePassword = useMutation({
    mutationFn: async (values: { contrasena_actual: string; nueva_contrasena: string }) => {
      await api.post('/api/chofer/cambiar-contrasena', values)
    },
    onSuccess: () => {
      setPasswordAlert({ type: 'success', message: 'Contraseña cambiada exitosamente.' })
      setTimeout(() => setPasswordAlert(null), 5000)
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ??
        'No se pudo cambiar la contraseña. Verificá tu contraseña actual.'
      setPasswordAlert({ type: 'error', message: msg })
    },
  })

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.skeleton}>
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {/* Page header */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Mi perfil</h1>
        <p className={styles.pageSubtitle}>Información personal y configuración de seguridad</p>
      </div>

      <div className={styles.layout}>

        {/* ── Card: Datos personales ───────────────────────────────────────── */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardIcon}>
              <User size={18} />
            </div>
            <h2 className={styles.cardTitle}>Datos personales</h2>
          </div>

          <div className={styles.cardBody}>
            {/* Avatar initials */}
            <div className={styles.avatarWrapper}>
              <div className={styles.avatar}>
                {perfil?.nombre?.charAt(0).toUpperCase() ?? '?'}
                {perfil?.apellido?.charAt(0).toUpperCase() ?? ''}
              </div>
              <div>
                <p className={styles.avatarName}>
                  {perfil ? `${perfil.nombre} ${perfil.apellido}` : '—'}
                </p>
                <p className={styles.avatarEmail}>{perfil?.email}</p>
              </div>
            </div>

            <div className={styles.divider} />

            {/* Read-only fields */}
            <div className={styles.infoGrid}>
              <InfoRow label="Nombre" value={perfil?.nombre} />
              <InfoRow label="Apellido" value={perfil?.apellido} />
              <InfoRow label="Email" value={perfil?.email} />
              <InfoRow label="DNI" value={perfil?.dni} />
              <InfoRow label="CUIL" value={perfil?.cuil} />
            </div>

            <div className={styles.divider} />

            {/* Editable: phone */}
            <div className={styles.phoneSection}>
              <div className={styles.phoneLabelRow}>
                <div className={styles.phoneLabelGroup}>
                  <Phone size={15} className={styles.phoneIcon} />
                  <span className={styles.infoLabel}>Teléfono</span>
                </div>
                {!editingPhone && (
                  <button
                    className={styles.editBtn}
                    onClick={() => {
                      setEditingPhone(true)
                      setPhoneAlert(null)
                    }}
                  >
                    <Pencil size={13} />
                    Editar
                  </button>
                )}
              </div>

              {editingPhone ? (
                <Formik
                  initialValues={{ telefono: perfil?.telefono ?? '' }}
                  validationSchema={telefonoSchema}
                  onSubmit={(values) => updatePhone.mutate(values.telefono)}
                >
                  {({ isSubmitting }) => (
                    <Form className={styles.phoneForm}>
                      <div className={styles.fieldWrapper}>
                        <Field
                          name="telefono"
                          type="tel"
                          className={styles.input}
                          placeholder="Ej: +54 11 1234-5678"
                          autoFocus
                        />
                        <ErrorMessage name="telefono" component="p" className={styles.fieldError} />
                      </div>
                      <div className={styles.phoneActions}>
                        <button
                          type="submit"
                          className={styles.btnPrimary}
                          disabled={isSubmitting || updatePhone.isPending}
                        >
                          {updatePhone.isPending ? 'Guardando…' : 'Guardar'}
                        </button>
                        <button
                          type="button"
                          className={styles.btnGhost}
                          onClick={() => {
                            setEditingPhone(false)
                            setPhoneAlert(null)
                          }}
                        >
                          <X size={14} />
                          Cancelar
                        </button>
                      </div>
                    </Form>
                  )}
                </Formik>
              ) : (
                <span className={styles.infoValue}>
                  {perfil?.telefono ?? <span className={styles.infoEmpty}>No informado</span>}
                </span>
              )}

              {phoneAlert && <Alert {...phoneAlert} />}
            </div>

            {/* CBU / cuenta bancaria */}
            {perfil?.cbu && (
              <>
                <div className={styles.divider} />
                <div className={styles.cbuSection}>
                  <div className={styles.cbuHeader}>
                    <Building2 size={15} className={styles.phoneIcon} />
                    <span className={styles.infoLabel}>Cuenta bancaria / CBU</span>
                  </div>
                  <span className={styles.cbuValue}>{perfil.cbu}</span>
                  {perfil.banco && (
                    <span className={styles.cbuBanco}>{perfil.banco}</span>
                  )}
                </div>
              </>
            )}
          </div>
        </section>

        {/* ── Card: Seguridad ──────────────────────────────────────────────── */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={`${styles.cardIcon} ${styles.cardIconSecurity}`}>
              <Lock size={18} />
            </div>
            <h2 className={styles.cardTitle}>Seguridad</h2>
          </div>

          <div className={styles.cardBody}>
            <p className={styles.securityHint}>
              Elegí una contraseña segura de al menos 8 caracteres que incluya mayúsculas y números.
            </p>

            {passwordAlert && <Alert {...passwordAlert} />}

            <Formik
              initialValues={{
                contrasena_actual: '',
                nueva_contrasena: '',
                confirmar_contrasena: '',
              }}
              validationSchema={passwordSchema}
              onSubmit={(values, { resetForm }) => {
                changePassword.mutate(
                  {
                    contrasena_actual: values.contrasena_actual,
                    nueva_contrasena: values.nueva_contrasena,
                  },
                  {
                    onSuccess: () => resetForm(),
                  }
                )
              }}
            >
              {({ errors, touched }) => (
                <Form className={styles.passwordForm}>
                  {/* Contraseña actual */}
                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="contrasena_actual">
                      Contraseña actual
                    </label>
                    <Field
                      id="contrasena_actual"
                      name="contrasena_actual"
                      type="password"
                      className={`${styles.input} ${
                        errors.contrasena_actual && touched.contrasena_actual ? styles.inputError : ''
                      }`}
                      placeholder="Tu contraseña actual"
                    />
                    <ErrorMessage
                      name="contrasena_actual"
                      component="p"
                      className={styles.fieldError}
                    />
                  </div>

                  {/* Nueva contraseña */}
                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="nueva_contrasena">
                      Nueva contraseña
                    </label>
                    <Field
                      id="nueva_contrasena"
                      name="nueva_contrasena"
                      type="password"
                      className={`${styles.input} ${
                        errors.nueva_contrasena && touched.nueva_contrasena ? styles.inputError : ''
                      }`}
                      placeholder="Mínimo 8 caracteres"
                    />
                    <ErrorMessage
                      name="nueva_contrasena"
                      component="p"
                      className={styles.fieldError}
                    />
                  </div>

                  {/* Confirmar contraseña */}
                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="confirmar_contrasena">
                      Confirmar nueva contraseña
                    </label>
                    <Field
                      id="confirmar_contrasena"
                      name="confirmar_contrasena"
                      type="password"
                      className={`${styles.input} ${
                        errors.confirmar_contrasena && touched.confirmar_contrasena ? styles.inputError : ''
                      }`}
                      placeholder="Repetí la nueva contraseña"
                    />
                    <ErrorMessage
                      name="confirmar_contrasena"
                      component="p"
                      className={styles.fieldError}
                    />
                  </div>

                  <button
                    type="submit"
                    className={styles.btnPrimary}
                    disabled={changePassword.isPending}
                  >
                    {changePassword.isPending ? 'Cambiando…' : 'Cambiar contraseña'}
                  </button>
                </Form>
              )}
            </Formik>
          </div>
        </section>
      </div>
    </div>
  )
}
