import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { Sidenav } from '@/components/Sidenav/Sidenav'
import styles from './App.module.css'

export const AppLayout = () => {
  const [sidenavOpen, setSidenavOpen] = useState(false)

  return (
    <div className={styles.container}>
      {/* Mobile top bar */}
      <header className={styles.mobileHeader}>
        <button className={styles.hamburger} onClick={() => setSidenavOpen(true)}>
          <Menu size={22} />
        </button>
        <div className={styles.mobileLogoWrap}>
          <span className={styles.mobileLogoMark}>EP</span>
          <span className={styles.mobileLogoName}>Enviopack Adelantos</span>
        </div>
      </header>

      {/* Sidenav overlay on mobile */}
      {sidenavOpen && (
        <div className={styles.sidenavOverlay} onClick={() => setSidenavOpen(false)} />
      )}

      <Sidenav isOpen={sidenavOpen} onClose={() => setSidenavOpen(false)} />

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
