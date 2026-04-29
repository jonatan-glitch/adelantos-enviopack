import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  History,
  ClipboardList,
  ClipboardCheck,
  Users,
  UserCog,
  Settings,
  BarChart3,
  LogOut,
  ChevronRight,
  FileSpreadsheet,
  X,
  UserCircle,
} from 'lucide-react'
import { ROUTES, ROLES } from '@/domain/constants'
import { useRoles } from '@/hooks/useRoles'
import { useLogout } from '@/hooks/useLogout'
import { useAppSelector } from '@/hooks/useAppSelector'
import logoWhite from '@/assets/logotipo-enviopack-white.svg'
import styles from './Sidenav.module.css'

interface NavItemDef {
  to: string
  label: string
  icon: React.ReactNode
}

interface SidenavProps {
  isOpen?: boolean
  onClose?: () => void
}

const ConductorNav: NavItemDef[] = [
  { to: ROUTES.DASHBOARD, label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { to: ROUTES.FACTURAS, label: 'Mis Facturas', icon: <FileText size={18} /> },
  { to: ROUTES.HISTORIAL, label: 'Historial', icon: <History size={18} /> },
  { to: ROUTES.PERFIL, label: 'Mi Perfil', icon: <UserCircle size={18} /> },
]

const AdminNav: NavItemDef[] = [
  { to: ROUTES.ADMIN_PROFORMAS, label: 'Proformas', icon: <FileSpreadsheet size={18} /> },
  { to: ROUTES.ADMIN_FACTURAS, label: 'Facturas', icon: <FileText size={18} /> },
  { to: ROUTES.ADMIN_CHOFERES, label: 'Proveedores', icon: <Users size={18} /> },
  { to: ROUTES.ADMIN_DISPONIBILIDAD, label: 'Disponibilidad', icon: <ClipboardCheck size={18} /> },
  { to: ROUTES.ADMIN_USUARIOS, label: 'Usuarios', icon: <UserCog size={18} /> },
  { to: ROUTES.ADMIN_REPORTES, label: 'Reportes', icon: <BarChart3 size={18} /> },
  { to: ROUTES.ADMIN_CONFIGURACION, label: 'Configuración', icon: <Settings size={18} /> },
]

export const Sidenav = ({ isOpen = false, onClose }: SidenavProps) => {
  const { isAdmin, isSupervisor, isConductor, hasRole } = useRoles()
  const profile = useAppSelector((s) => s.profile)
  const logout = useLogout()
  const location = useLocation()
  const showAdminNav = isAdmin || isSupervisor
  const showBothNavs = showAdminNav && isConductor
  const filteredAdminNav = AdminNav.filter(() => true)

  const handleNavClick = () => {
    onClose?.()
  }

  return (
    <aside className={`${styles.sidenav} ${isOpen ? styles.sidenavOpen : ''}`}>
      {/* Logo */}
      <div className={styles.logo}>
        <img src={logoWhite} alt="Enviopack" className={styles.logoImg} />
        <button className={styles.logoClose} onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className={styles.nav}>
        {showAdminNav && (
          <div className={styles.section}>
            <p className={styles.sectionTitle}>Administración</p>
            {filteredAdminNav.map((item) => (
              <NavItem
                key={item.to}
                {...item}
                active={location.pathname.startsWith(item.to)}
                onClick={handleNavClick}
              />
            ))}
          </div>
        )}

        {(isConductor || showBothNavs) && (
          <div className={styles.section}>
            {showBothNavs && <p className={styles.sectionTitle}>Chofer</p>}
            {ConductorNav.map((item) => (
              <NavItem
                key={item.to}
                {...item}
                active={location.pathname === item.to || location.pathname.startsWith(item.to + '/')}
                onClick={handleNavClick}
              />
            ))}
          </div>
        )}

        {!showAdminNav && !isConductor && (
          <div className={styles.section}>
            {(showAdminNav ? AdminNav : ConductorNav).map((item) => (
              <NavItem
                key={item.to}
                {...item}
                active={location.pathname === item.to}
                onClick={handleNavClick}
              />
            ))}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className={styles.footer}>
        <div className={styles.profile}>
          <div className={styles.avatar}>
            {profile?.nombre?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div className={styles.profileInfo}>
            <p className={styles.profileName}>
              {profile ? `${profile.nombre} ${profile.apellido}` : 'Usuario'}
            </p>
            <p className={styles.profileEmail}>{profile?.email ?? ''}</p>
          </div>
        </div>
        <button className={styles.logoutBtn} onClick={logout} title="Cerrar sesión">
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  )
}

const NavItem = ({
  to,
  label,
  icon,
  active,
  onClick,
}: NavItemDef & { active: boolean; onClick: () => void }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `${styles.navItem} ${(isActive || active) ? styles.navItemActive : ''}`
    }
    end={to === ROUTES.DASHBOARD}
    onClick={onClick}
  >
    <span className={styles.navIcon}>{icon}</span>
    <span className={styles.navLabel}>{label}</span>
    <ChevronRight size={14} className={styles.navChevron} />
  </NavLink>
)
