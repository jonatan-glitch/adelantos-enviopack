import axios from 'axios'
import { EXCLUDED_AUTH_URLS } from '@/domain/constants'
import {
  clearAllStorage,
  getAccessToken,
} from '@/shared/utilities/auth.utility'
import type { ApiError } from '@/domain/models'

export class ErrorResponse extends Error {
  code: number
  errors?: Record<string, string>

  constructor(axiosError: unknown) {
    const err = axiosError as {
      response?: { data?: ApiError; status?: number }
      message?: string
    }
    const data = err.response?.data
    super(data?.message ?? err.message ?? 'Error desconocido')
    this.code = err.response?.status ?? 0
    this.errors = data?.errors
  }
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

const refreshTokenFn = async (refreshToken: string) => {
  const { data } = await axios.post<{ data: { token: string; refresh_token: string } }>(
    `${import.meta.env.VITE_API_URL ?? 'http://localhost:8000'}/api/token/refresh`,
    { refresh_token: refreshToken }
  )
  return data.data
}

api.interceptors.request.use(async (config) => {
  const isExcluded = EXCLUDED_AUTH_URLS.some((url) => config.url?.includes(url))
  if (isExcluded) return config

  const token = await getAccessToken(refreshTokenFn)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean }

    if ([401, 403].includes(error.response?.status) && !originalRequest._retry) {
      originalRequest._retry = true
      try {
        const token = await getAccessToken(refreshTokenFn)
        if (token) {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        }
      } catch {
        // fall through to logout
      }
      clearAllStorage()
      window.location.href = '/login'
    }

    return Promise.reject(new ErrorResponse(error))
  }
)

export default api
