import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import * as Yup from 'yup'
import { Eye, EyeOff } from 'lucide-react'
import { useAppDispatch } from '@/hooks/useAppSelector'
import { loginThunk } from '@/store/thunks/auth.thunk'
import { ROUTES } from '@/domain/constants'
import { ErrorResponse } from '@/infrastructure/interceptors/api.interceptor'
import styles from './Login.module.css'

const schema = Yup.object({
  email: Yup.string().email('Email inválido').required('El email es obligatorio'),
  contrasena: Yup.string().required('La contraseña es obligatoria'),
  recordar: Yup.boolean(),
})

export const LoginPage = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Ingresar a Enviopack</h2>

      <Formik
        initialValues={{ email: '', contrasena: '', recordar: true }}
        validationSchema={schema}
        onSubmit={async (values, { setSubmitting }) => {
          setServerError('')
          try {
            await dispatch(loginThunk(values)).unwrap()
            navigate(ROUTES.DASHBOARD)
          } catch (err) {
            const code = err instanceof ErrorResponse ? err.code : 0
            if (code === 401) {
              setServerError('Email o contraseña incorrectos. Verificá tus datos e intentá de nuevo.')
            } else if (code === 403) {
              setServerError('Tu cuenta fue deshabilitada. Contactá al administrador.')
            } else {
              setServerError('Error de conexión. Intentá de nuevo en unos segundos.')
            }
          } finally {
            setSubmitting(false)
          }
        }}
      >
        {({ isSubmitting }) => (
          <Form className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="email">EMAIL</label>
              <Field
                id="email"
                name="email"
                type="email"
                className={styles.input}
                autoComplete="email"
              />
              <ErrorMessage name="email" component="p" className={styles.error} />
            </div>

            <div className={styles.field}>
              <div className={styles.labelRow}>
                <label className={styles.label} htmlFor="contrasena">CONTRASEÑA</label>
                <Link to={ROUTES.RECUPERAR_PASSWORD} className={styles.link}>
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className={styles.passwordWrapper}>
                <Field
                  id="contrasena"
                  name="contrasena"
                  type={showPassword ? 'text' : 'password'}
                  className={styles.input}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <ErrorMessage name="contrasena" component="p" className={styles.error} />
            </div>

            <label className={styles.checkboxLabel}>
              <Field name="recordar" type="checkbox" className={styles.checkbox} />
              Recordar mi usuario
            </label>

            {serverError && (
              <div className={styles.serverError}>{serverError}</div>
            )}

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Ingresando...' : 'Iniciar sesión'}
            </button>
          </Form>
        )}
      </Formik>
    </div>
  )
}
