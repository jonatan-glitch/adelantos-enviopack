import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import * as Yup from 'yup'
import api from '@/infrastructure/interceptors/api.interceptor'
import { ROUTES } from '@/domain/constants'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import styles from '../Registro/Registro.module.css'

const schema = Yup.object({
  nombre: Yup.string().required('El nombre es obligatorio'),
  apellido: Yup.string().required('El apellido es obligatorio'),
  contrasena: Yup.string().min(8, 'Mínimo 8 caracteres').required('La contraseña es obligatoria'),
  confirmar_contrasena: Yup.string()
    .oneOf([Yup.ref('contrasena')], 'Las contraseñas no coinciden')
    .required('Confirmá tu contraseña'),
})

const ROLE_LABELS: Record<string, string> = {
  ROLE_OWNER: 'Owner',
  ROLE_ADMINISTRADOR: 'Administrador',
  ROLE_SUPERVISOR: 'Supervisor Operativo',
}

type InviteInfo = { email: string; rol: string; expira_en: string }

export const RegistroAdminPage = () => {
  const { token } = useParams<{ token: string }>()
  const [loading, setLoading] = useState(true)
  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [serverError, setServerError] = useState('')

  useEffect(() => {
    if (!token) return
    api.get(`/api/registro-admin/${token}`)
      .then((res) => setInvite(res.data.data ?? res.data))
      .catch(() => setError('La invitación no existe o ya expiró.'))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div className={styles.center}>
        <Loader2 size={32} className={styles.spinner} />
        <p className={styles.loadingText}>Verificando invitación...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.center}>
        <AlertCircle size={48} color="#EF4444" />
        <h2 className={styles.errorTitle}>Invitación inválida</h2>
        <p className={styles.errorText}>{error}</p>
        <Link to={ROUTES.LOGIN} className={styles.link}>Ir al login</Link>
      </div>
    )
  }

  if (done) {
    return (
      <div className={styles.center}>
        <CheckCircle size={48} color="#22C55E" />
        <h2 className={styles.successTitle}>Registro completado</h2>
        <p className={styles.successText}>Ya podés iniciar sesión con tu email y contraseña.</p>
        <Link to={ROUTES.LOGIN} className={styles.link}>Iniciar sesión</Link>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Completá tu registro</h2>
      <p className={styles.subtitle}>
        Email: <strong>{invite?.email}</strong>
        {invite?.rol && (
          <> — Rol: <strong>{ROLE_LABELS[invite.rol] ?? invite.rol}</strong></>
        )}
      </p>

      <Formik
        initialValues={{
          nombre: '',
          apellido: '',
          contrasena: '',
          confirmar_contrasena: '',
        }}
        validationSchema={schema}
        onSubmit={async (values, { setSubmitting }) => {
          setServerError('')
          try {
            await api.post(`/api/registro-admin/${token}`, {
              nombre: values.nombre,
              apellido: values.apellido,
              contrasena: values.contrasena,
            })
            setDone(true)
          } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
              || 'Error al completar el registro.'
            setServerError(msg)
          } finally {
            setSubmitting(false)
          }
        }}
      >
        {({ isSubmitting }) => (
          <Form className={styles.form}>
            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="nombre">NOMBRE</label>
                <Field id="nombre" name="nombre" className={styles.input} />
                <ErrorMessage name="nombre" component="p" className={styles.error} />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="apellido">APELLIDO</label>
                <Field id="apellido" name="apellido" className={styles.input} />
                <ErrorMessage name="apellido" component="p" className={styles.error} />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="contrasena">CONTRASEÑA</label>
              <Field id="contrasena" name="contrasena" type="password" className={styles.input} />
              <ErrorMessage name="contrasena" component="p" className={styles.error} />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="confirmar_contrasena">CONFIRMAR CONTRASEÑA</label>
              <Field id="confirmar_contrasena" name="confirmar_contrasena" type="password" className={styles.input} />
              <ErrorMessage name="confirmar_contrasena" component="p" className={styles.error} />
            </div>

            {serverError && (
              <div className={styles.serverError}>{serverError}</div>
            )}

            <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
              {isSubmitting ? 'Registrando...' : 'Completar registro'}
            </button>
          </Form>
        )}
      </Formik>
    </div>
  )
}
