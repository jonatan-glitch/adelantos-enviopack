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
              <Field
                id="contrasena"
                name="contrasena"
                type="password"
                className={styles.input}
                autoComplete="current-password"
              />
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
