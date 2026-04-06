import { Navigate, Route, Routes } from 'react-router-dom'
import { ROUTES, ADMIN_ROLES, SUPERVISOR_ROLES } from '@/domain/constants'

// Layouts
import { PublicLayout } from '@/layouts/Public/Public.layout'
import { AppLayout } from '@/layouts/App/App.layout'

// Guards
import { PrivateRoute } from '@/components/PrivateRoute/PrivateRoute'
import { PermissionGuard } from '@/components/PermissionGuard/PermissionGuard'

// Public pages
import { LoginPage } from '@/pages/Login/Login.page'
import { RecuperarPasswordPage } from '@/pages/RecuperarPassword/RecuperarPassword.page'
import { RegistroPage } from '@/pages/Registro/Registro.page'
import { RegistroAdminPage } from '@/pages/RegistroAdmin/RegistroAdmin.page'

// Chofer pages
import { DashboardPage } from '@/pages/chofer/Dashboard/Dashboard.page'
import { FacturasPage } from '@/pages/chofer/Facturas/Facturas.page'
// Adelantos page removed — info visible in Facturas
import { HistorialPage } from '@/pages/chofer/Historial/Historial.page'
import { PerfilPage } from '@/pages/chofer/Perfil/Perfil.page'

// Admin pages
import { SolicitudesPage } from '@/pages/admin/Solicitudes/Solicitudes.page'
import { ProformasPage } from '@/pages/admin/Proformas/Proformas.page'
import { ChoferesPage } from '@/pages/admin/Choferes/Choferes.page'
import { ChoferDetallePage } from '@/pages/admin/Choferes/ChoferDetalle.page'
import { ConfiguracionPage } from '@/pages/admin/Configuracion/Configuracion.page'
import { ReportesPage } from '@/pages/admin/Reportes/Reportes.page'
import { FacturasAdminPage } from '@/pages/admin/Facturas/Facturas.page'
import { UsuariosPage } from '@/pages/admin/Usuarios/Usuarios.page'

const NotFound = () => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', height: '60vh', gap: 12,
    color: 'var(--color-gray-500)',
  }}>
    <p style={{ fontSize: 64, fontWeight: 800, color: 'var(--color-gray-200)' }}>404</p>
    <p style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600 }}>Página no encontrada</p>
    <a href={ROUTES.DASHBOARD} style={{ color: 'var(--color-accent)' }}>Ir al inicio</a>
  </div>
)

export const AppRoutes = () => (
  <Routes>
    {/* Public */}
    <Route element={<PublicLayout />}>
      <Route path={ROUTES.LOGIN} element={<LoginPage />} />
      <Route path={ROUTES.REGISTRO} element={<RegistroPage />} />
      <Route path={ROUTES.REGISTRO_ADMIN} element={<RegistroAdminPage />} />
      <Route path={ROUTES.RECUPERAR_PASSWORD} element={<RecuperarPasswordPage />} />
    </Route>

    {/* Private */}
    <Route element={<PrivateRoute />}>
      <Route element={<AppLayout />}>

        {/* Chofer routes */}
        <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
        <Route path={ROUTES.FACTURAS} element={<FacturasPage />} />
        {/* Adelantos removed — chofer tracks state from Facturas */}
        <Route path={ROUTES.HISTORIAL} element={<HistorialPage />} />
        <Route path={ROUTES.PERFIL} element={<PerfilPage />} />

        {/* Admin routes */}
        <Route
          path={ROUTES.ADMIN_SOLICITUDES}
          element={
            <PermissionGuard requiredRoles={SUPERVISOR_ROLES}>
              <SolicitudesPage />
            </PermissionGuard>
          }
        />
        <Route
          path={ROUTES.ADMIN_PROFORMAS}
          element={
            <PermissionGuard requiredRoles={SUPERVISOR_ROLES}>
              <ProformasPage />
            </PermissionGuard>
          }
        />
        <Route
          path={ROUTES.ADMIN_FACTURAS}
          element={
            <PermissionGuard requiredRoles={SUPERVISOR_ROLES}>
              <FacturasAdminPage />
            </PermissionGuard>
          }
        />
        <Route
          path={ROUTES.ADMIN_CHOFERES}
          element={
            <PermissionGuard requiredRoles={SUPERVISOR_ROLES}>
              <ChoferesPage />
            </PermissionGuard>
          }
        />
        <Route
          path={ROUTES.ADMIN_USUARIOS}
          element={
            <PermissionGuard requiredRoles={SUPERVISOR_ROLES}>
              <UsuariosPage />
            </PermissionGuard>
          }
        />
        <Route
          path={ROUTES.ADMIN_CHOFER_DETALLE}
          element={
            <PermissionGuard requiredRoles={SUPERVISOR_ROLES}>
              <ChoferDetallePage />
            </PermissionGuard>
          }
        />
        <Route
          path={ROUTES.ADMIN_CONFIGURACION}
          element={
            <PermissionGuard requiredRoles={ADMIN_ROLES}>
              <ConfiguracionPage />
            </PermissionGuard>
          }
        />
        <Route
          path={ROUTES.ADMIN_REPORTES}
          element={
            <PermissionGuard requiredRoles={SUPERVISOR_ROLES}>
              <ReportesPage />
            </PermissionGuard>
          }
        />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Route>

    {/* Catch-all for unmatched routes outside private */}
    <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
  </Routes>
)
