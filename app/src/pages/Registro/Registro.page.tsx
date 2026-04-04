import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import * as Yup from 'yup'
import api from '@/infrastructure/interceptors/api.interceptor'
import { ROUTES } from '@/domain/constants'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import styles from './Registro.module.css'

const schema = Yup.object({
  nombre: Yup.string().required('El nombre es obligatorio'),
  apellido: Yup.string().required('El apellido es obligatorio'),
  dni: Yup.string().required('El DNI es obligatorio'),
  cuil: Yup.string().required('El CUIL es obligatorio'),
  contrasena: Yup.string().min(6, 'Mínimo 6 caracteres').required('La contraseña es obligatoria'),
  confirmar_contrasena: Yup.string()
    .oneOf([Yup.ref('contrasena')], 'Las contraseñas no coinciden')
    .required('Confirmá tu contraseña'),
})

type InviteInfo = { email: string; expira_en: string }

export const RegistroPage = () => {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [serverError, setServerError] = useState('')

  useEffect(() => {
    if (!token) return
    api.get(`/api/registro/${token}`)
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
      </p>

      <Formik
        initialValues={{
          nombre: '',
          apellido: '',
          dni: '',
          cuil: '',
          contrasena: '',
          confirmar_contrasena: '',
        }}
        validationSchema={schema}
        onSubmit={async (values, { setSubmitting }) => {
          setServerError('')
          try {
            await api.post(`/api/registro/${token}`, {
              nombre: values.nombre,
              apellido: values.apellido,
              dni: values.dni,
              cuil: values.cuil,
              contrasena: values.contrasena,
            })
            setDone(true)
          } catch (err: any) {
            const msg = err?.response?.data?.message || 'Error al completar el registro.'
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

            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="dni">DNI</label>
                <Field id="dni" name="dni" className={styles.input} placeholder="12345678" />
                <ErrorMessage name="dni" component="p" className={styles.error} />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="cuil">CUIL</label>
                <Field id="cuil" name="cuil" className={styles.input} placeholder="20-12345678-9" />
                <ErrorMessage name="cuil" component="p" className={styles.error} />
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
