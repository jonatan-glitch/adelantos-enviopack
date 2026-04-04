import { jwtDecode } from 'jwt-decode'
import type { JwtPayload } from '@/domain/models'

const SKEW_SECONDS = 30
const ACCESS_TOKEN_KEY = 'access_token'
const REFRESH_TOKEN_KEY = 'refresh_token'
const STORAGE_TYPE_KEY = 'storage_type'

type StorageType = 'local' | 'session'

export const getStorage = (): Storage => {
  const type = localStorage.getItem(STORAGE_TYPE_KEY) as StorageType
  return type === 'local' ? localStorage : sessionStorage
}

export const saveTokens = (token: string, refreshToken: string, remember: boolean): void => {
  const storage = remember ? localStorage : sessionStorage
  localStorage.setItem(STORAGE_TYPE_KEY, remember ? 'local' : 'session')
  storage.setItem(ACCESS_TOKEN_KEY, token)
  storage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

export const getTokenRaw = (): string | null => {
  return (
    localStorage.getItem(ACCESS_TOKEN_KEY) ||
    sessionStorage.getItem(ACCESS_TOKEN_KEY)
  )
}

export const getRefreshTokenRaw = (): string | null => {
  return (
    localStorage.getItem(REFRESH_TOKEN_KEY) ||
    sessionStorage.getItem(REFRESH_TOKEN_KEY)
  )
}

export const clearAllStorage = (): void => {
  [ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, STORAGE_TYPE_KEY].forEach((key) => {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  })
}

export const decodeToken = (token: string): JwtPayload | null => {
  try {
    return jwtDecode<JwtPayload>(token)
  } catch {
    return null
  }
}

export const isTokenValid = (token: string | null): boolean => {
  if (!token) return false
  const decoded = decodeToken(token)
  if (!decoded) return false
  const now = Math.floor(Date.now() / 1000)
  return decoded.exp > now + SKEW_SECONDS
}

let refreshPromise: Promise<string> | null = null

export const getAccessToken = async (
  doRefresh: (refreshToken: string) => Promise<{ token: string; refresh_token: string }>
): Promise<string | null> => {
  const current = getTokenRaw()
  if (isTokenValid(current)) return current

  const refreshToken = getRefreshTokenRaw()
  if (!refreshToken) return null

  if (!refreshPromise) {
    refreshPromise = doRefresh(refreshToken)
      .then((data) => {
        const storage = getStorage()
        storage.setItem(ACCESS_TOKEN_KEY, data.token)
        storage.setItem(REFRESH_TOKEN_KEY, data.refresh_token)
        return data.token
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}
