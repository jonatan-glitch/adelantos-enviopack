import { Outlet } from 'react-router-dom'
import logoWhite from '@/assets/logotipo-enviopack-white.svg'
import styles from './Public.module.css'

export const PublicLayout = () => (
  <div className={styles.container}>
    {/* Left: Branding */}
    <div className={styles.branding}>
      <img src={logoWhite} alt="Enviopack" className={styles.logo} />
      <span className={styles.version}>Versión 1.0</span>
    </div>

    {/* Right: Form */}
    <div className={styles.form}>
      <div className={styles.formContent}>
        <Outlet />
      </div>
      <span className={styles.copyright}>Copyright @2017-2026 - Enviopack.</span>
    </div>
  </div>
)
