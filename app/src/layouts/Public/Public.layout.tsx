import { Outlet } from 'react-router-dom'
import styles from './Public.module.css'

export const PublicLayout = () => (
  <div className={styles.container}>
    {/* Left: Branding */}
    <div className={styles.branding}>
      <div className={styles.brandingContent}>
        <div className={styles.logoMark}>EP</div>
        <h1 className={styles.brandName}>Enviopack</h1>
        <p className={styles.tagline}>Envíos sin fricción. Soluciones con impacto.</p>
        <div className={styles.feature}>
          <div className={styles.featureDot} />
          <p>Adelantá tus facturas en 48 horas hábiles</p>
        </div>
        <div className={styles.feature}>
          <div className={styles.featureDot} />
          <p>Visibilidad total del estado de tus cobros</p>
        </div>
        <div className={styles.feature}>
          <div className={styles.featureDot} />
          <p>Proceso 100% digital y seguro</p>
        </div>
      </div>
    </div>

    {/* Right: Form */}
    <div className={styles.form}>
      <div className={styles.formContent}>
        <Outlet />
      </div>
    </div>
  </div>
)
