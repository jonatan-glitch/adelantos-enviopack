import type { AuthTokens, Usuario } from '@/domain/models'

// Mock tokens válidos hasta el año 2038
const ADMIN_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBlbnZpb3BhY2suY29tIiwicm9sZXMiOlsiUk9MRV9FTlZJT1BBQ0tfQURNSU4iXSwiaWRfc2VzaW9uIjoxLCJleHAiOjIxNDc0ODM2NDd9.mock'

const CHOFER_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiZW1haWwiOiJjaG9mZXJAZW52aW9wYWNrLmNvbSIsInJvbGVzIjpbIlJPTEVfQ09ORFVDVE9SIl0sImlkX3Nlc2lvbiI6MiwiZXhwIjoyMTQ3NDgzNjQ3fQ.mock'

interface MockUser {
  tokens: AuthTokens
  profile: Usuario
}

const MOCK_USERS: Record<string, MockUser> = {
  'admin@enviopack.com': {
    tokens: { token: ADMIN_TOKEN, refresh_token: 'mock_refresh_admin' },
    profile: {
      id: 1,
      nombre: 'Admin',
      apellido: 'Demo',
      email: 'admin@enviopack.com',
      roles: ['ROLE_ENVIOPACK_ADMIN'],
      habilitado: true,
    },
  },
  'chofer@enviopack.com': {
    tokens: { token: CHOFER_TOKEN, refresh_token: 'mock_refresh_chofer' },
    profile: {
      id: 2,
      nombre: 'Juan',
      apellido: 'Pérez',
      email: 'chofer@enviopack.com',
      roles: ['ROLE_CONDUCTOR'],
      habilitado: true,
      tasa_personal: 4.5,
    },
  },
}

export const MOCK_PASSWORD = 'demo1234'

export const getMockUser = (email: string, password: string): MockUser | null => {
  if (password !== MOCK_PASSWORD) return null
  return MOCK_USERS[email] ?? null
}
