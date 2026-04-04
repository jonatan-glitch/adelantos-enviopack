import { Navigate, Outlet } from 'react-router-dom'
import { useAppSelector } from '@/hooks/useAppSelector'
import { ROUTES } from '@/domain/constants'

export const PrivateRoute = () => {
  const { data, hydrated } = useAppSelector((s) => s.auth)

  if (!hydrated) return null
  return data.isAuthenticated ? <Outlet /> : <Navigate to={ROUTES.LOGIN} replace />
}
