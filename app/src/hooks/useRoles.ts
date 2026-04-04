import { useAppSelector } from './useAppSelector'
import { ROLES, ADMIN_ROLES, type Role } from '@/domain/constants'

export const useRoles = () => {
  const profile = useAppSelector((s) => s.profile)
  const roles = profile?.roles ?? []

  const hasRole = (role: Role) => roles.includes(role)
  const hasAnyRole = (requiredRoles: Role[]) =>
    requiredRoles.some((r) => roles.includes(r))

  const isAdmin = hasAnyRole(ADMIN_ROLES)
  const isSupervisor = hasRole(ROLES.SUPERVISOR) || isAdmin
  const isConductor = hasRole(ROLES.CONDUCTOR)

  return { roles, hasRole, hasAnyRole, isAdmin, isSupervisor, isConductor }
}
