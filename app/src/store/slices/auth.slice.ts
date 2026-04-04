import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { JwtPayload } from '@/domain/models'

interface AuthData {
  isAuthenticated: boolean
  token: string | null
  payload: JwtPayload | null
}

interface AuthState {
  data: AuthData
  hydrated: boolean
}

const initialState: AuthState = {
  data: {
    isAuthenticated: false,
    token: null,
    payload: null,
  },
  hydrated: false,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuth(state, action: PayloadAction<{ token: string; payload: JwtPayload }>) {
      state.data.isAuthenticated = true
      state.data.token = action.payload.token
      state.data.payload = action.payload.payload
    },
    clearAuth(state) {
      state.data = initialState.data
    },
    setHydrated(state, action: PayloadAction<boolean>) {
      state.hydrated = action.payload
    },
  },
})

export const { setAuth, clearAuth, setHydrated } = authSlice.actions
export default authSlice.reducer
