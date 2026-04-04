import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { Usuario } from '@/domain/models'

type ProfileState = Usuario | null

const profileSlice = createSlice({
  name: 'profile',
  initialState: null as ProfileState,
  reducers: {
    setProfile(_state, action: PayloadAction<Usuario>) {
      return action.payload
    },
    clearProfile() {
      return null
    },
  },
})

export const { setProfile, clearProfile } = profileSlice.actions
export default profileSlice.reducer
