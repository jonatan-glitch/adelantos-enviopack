import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/hooks/useAppSelector'
import { hydrateAuthThunk } from '@/store/thunks/auth.thunk'

const LoadingScreen = () => (
  <div style={{
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--color-gray-50)',
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: 40,
        height: 40,
        border: '3px solid var(--color-gray-200)',
        borderTopColor: 'var(--color-accent)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        margin: '0 auto 12px',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <p style={{ color: 'var(--color-gray-400)', fontSize: 'var(--font-size-sm)' }}>
        Cargando...
      </p>
    </div>
  </div>
)

export const AuthBoot = ({ children }: { children: React.ReactNode }) => {
  const dispatch = useAppDispatch()
  const hydrated = useAppSelector((s) => s.auth.hydrated)

  useEffect(() => {
    dispatch(hydrateAuthThunk())
  }, [dispatch])

  if (!hydrated) return <LoadingScreen />
  return <>{children}</>
}
