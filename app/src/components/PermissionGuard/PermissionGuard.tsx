import type { Role } from '@/domain/constants'
import { useRoles } from '@/hooks/useRoles'

interface Props {
  children: React.ReactNode
  requiredRoles?: Role[]
  fallback?: React.ReactNode
}

const LockedContent = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    minHeight: 300,
    color: 'var(--color-gray-400)',
    gap: 8,
  }}>
    <span style={{ fontSize: 48 }}>🔒</span>
    <p style={{ fontWeight: 600, color: 'var(--color-gray-600)' }}>Acceso restringido</p>
    <p style={{ fontSize: 'var(--font-size-sm)' }}>No tenés permiso para ver esta sección.</p>
  </div>
)

export const PermissionGuard = ({ children, requiredRoles = [], fallback }: Props) => {
  const { hasAnyRole } = useRoles()

  if (requiredRoles.length > 0 && !hasAnyRole(requiredRoles)) {
    return <>{fallback ?? <LockedContent />}</>
  }

  return <>{children}</>
}
