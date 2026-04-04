import { useAppDispatch } from './useAppSelector'
import { logoutThunk } from '@/store/thunks/auth.thunk'

export const useLogout = () => {
  const dispatch = useAppDispatch()
  return () => dispatch(logoutThunk())
}
