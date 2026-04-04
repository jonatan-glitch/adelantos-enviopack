import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import * as Yup from 'yup'
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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Iniciar sesión</h2>
        <p className={styles.subtitle}>Plataforma de adelanto de facturas</p>
      </div>

      <Formik
        initialValues={{ email: '', contrasena: '', recordar: false }}
        validationSchema={schema}
        onSubmit={async (values, { setSubmitting }) => {
          setServerError('')
          try {
            await dispatch(loginThunk(values)).unwrap()
            navigate(ROUTES.DASHBOARD)
          } catch (err) {
            if (err instanceof ErrorResponse) {
              setServerError(err.message)
            } else {
              setServerError('Email o contraseña incorrectos')
            }
          } finally {
            setSubmitting(false)
          }
        }}
      >
        {({ isSubmitting }) => (
          <Form className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="email">Email</label>
              <Field
                id="email"
                name="email"
                type="email"
                className={styles.input}
                placeholder="tu@email.com"
                autoComplete="email"
              />
              <ErrorMessage name="email" component="p" className={styles.error} />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="contrasena">Contraseña</label>
              <Field
                id="contrasena"
                name="contrasena"
                type="password"
                className={styles.input}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <ErrorMessage name="contrasena" component="p" className={styles.error} />
            </div>

            <div className={styles.row}>
              <label className={styles.checkboxLabel}>
                <Field name="recordar" type="checkbox" className={styles.checkbox} />
                Recordar sesión
              </label>
              <Link to={ROUTES.RECUPERAR_PASSWORD} className={styles.link}>
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            {serverError && (
              <div className={styles.serverError}>{serverError}</div>
            )}

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Ingresando...' : 'Ingresar'}
            </button>
          </Form>
        )}
      </Formik>
    </div>
  )
}
