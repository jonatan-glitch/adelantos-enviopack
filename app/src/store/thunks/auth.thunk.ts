import { createAsyncThunk } from '@reduxjs/toolkit'
import api from '@/infrastructure/interceptors/api.interceptor'
import {
  clearAllStorage,
  decodeToken,
  getTokenRaw,
  isTokenValid,
  saveTokens,
} from '@/shared/utilities/auth.utility'
import { clearAuth, setAuth, setHydrated } from '../slices/auth.slice'
import { clearProfile, setProfile } from '../slices/profile.slice'
import type { AuthTokens, LoginRequest, Usuario } from '@/domain/models'
import type { AppDispatch } from '../store'
import { getMockUser } from '@/infrastructure/mocks/auth.mock'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type _Dispatch = AppDispatch

export const loginThunk = createAsyncThunk(
  'auth/login',
  async (payload: LoginRequest, { dispatch, rejectWithValue }) => {
    try {
      // Mock demo users — solo activo en local sin API real configurada
      const apiUrl = import.meta.env.APP_API_URL ?? ''
      const useMock = !apiUrl || apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1')
      const mockUser = useMock ? getMockUser(payload.email, payload.contrasena) : null
      if (mockUser) {
        const { tokens, profile } = mockUser
        saveTokens(tokens.token, tokens.refresh_token, payload.recordar ?? false)
        const decoded = decodeToken(tokens.token)!
        dispatch(setAuth({ token: tokens.token, payload: decoded }))
        dispatch(setProfile(profile))
        return tokens
      }

      const { data } = await api.post<{ data: AuthTokens }>('/api/login', {
        email: payload.email,
        contrasena: payload.contrasena,
      })
      const tokens = data.data
      saveTokens(tokens.token, tokens.refresh_token, payload.recordar ?? false)
      const decoded = decodeToken(tokens.token)!

      dispatch(setAuth({ token: tokens.token, payload: decoded }))

      // Load profile
      const profileRes = await api.get<{ data: Usuario }>('/api/perfil')
      dispatch(setProfile(profileRes.data.data))

      return tokens
    } catch (err) {
      return rejectWithValue(err)
    }
  }
)

export const hydrateAuthThunk = createAsyncThunk(
  'auth/hydrate',
  async (_, { dispatch }) => {
    const token = getTokenRaw()
    if (token && isTokenValid(token)) {
      const decoded = decodeToken(token)!
      dispatch(setAuth({ token, payload: decoded }))
      try {
        const profileRes = await api.get<{ data: Usuario }>('/api/perfil')
        dispatch(setProfile(profileRes.data.data))
      } catch {
        // profile load failed, auth still valid
      }
    }
    dispatch(setHydrated(true))
  }
)

export const logoutThunk = () => (dispatch: AppDispatch) => {
  clearAllStorage()
  dispatch(clearAuth())
  dispatch(clearProfile())
  window.location.href = '/login'
}
