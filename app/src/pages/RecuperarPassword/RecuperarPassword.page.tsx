import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import * as Yup from 'yup'
import api from '@/infrastructure/interceptors/api.interceptor'
import { ROUTES } from '@/domain/constants'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import styles from './RecuperarPassword.module.css'

const schema = Yup.object({
  email: Yup.string().email('Email inválido').required('El email es obligatorio'),
})

export const RecuperarPasswordPage = () => {
  const [sent, setSent] = useState(false)

  if (sent) {
    return (
      <div className={styles.success}>
        <CheckCircle size={48} color="var(--color-success)" />
        <h2 className={styles.successTitle}>¡Revisá tu email!</h2>
        <p className={styles.successText}>
          Te enviamos las instrucciones para recuperar tu contraseña.
        </p>
        <Link to={ROUTES.LOGIN} className={styles.backLink}>
          <ArrowLeft size={16} />
          Volver al login
        </Link>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Recuperar contraseña</h2>
        <p className={styles.subtitle}>
          Ingresá tu email y te enviamos las instrucciones para recuperarla.
        </p>
      </div>

      <Formik
        initialValues={{ email: '' }}
        validationSchema={schema}
        onSubmit={async (values, { setSubmitting }) => {
          try {
            await api.post('/api/recuperar-contrasena', values)
            setSent(true)
          } catch {
            // Always show success to avoid email enumeration
            setSent(true)
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
              />
              <ErrorMessage name="email" component="p" className={styles.error} />
            </div>

            <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
              {isSubmitting ? 'Enviando...' : 'Enviar instrucciones'}
            </button>

            <Link to={ROUTES.LOGIN} className={styles.backBtn}>
              <ArrowLeft size={16} />
              Volver al login
            </Link>
          </Form>
        )}
      </Formik>
    </div>
  )
}
