export const ROLES = {
  ENVIOPACK_ADMIN: 'ROLE_ENVIOPACK_ADMIN',
  OWNER: 'ROLE_OWNER',
  ADMINISTRADOR: 'ROLE_ADMINISTRADOR',
  SUPERVISOR: 'ROLE_SUPERVISOR',
  CONDUCTOR: 'ROLE_CONDUCTOR',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

export const ADMIN_ROLES: Role[] = [
  ROLES.ENVIOPACK_ADMIN,
  ROLES.OWNER,
  ROLES.ADMINISTRADOR,
]

export const SUPERVISOR_ROLES: Role[] = [
  ...ADMIN_ROLES,
  ROLES.SUPERVISOR,
]

export const ROUTES = {
  // Públicas
  LOGIN: '/login',
  RECUPERAR_PASSWORD: '/recuperar-contrasena',

  // Chofer
  DASHBOARD: '/dashboard',
  FACTURAS: '/facturas',
  ADELANTOS: '/adelantos',
  HISTORIAL: '/historial',
  PERFIL: '/perfil',

  // Admin
  ADMIN_SOLICITUDES: '/admin/solicitudes',
  ADMIN_PROFORMAS: '/admin/proformas',
  ADMIN_CHOFERES: '/admin/choferes',
  ADMIN_CONFIGURACION: '/admin/configuracion',
  ADMIN_REPORTES: '/admin/reportes',
  ADMIN_CHOFER_DETALLE: '/admin/choferes/:id',
} as const

export const API_ROUTES = {
  LOGIN: '/api/login',
  REFRESH: '/api/token/refresh',
  PERFIL: '/api/perfil',

  FACTURAS: '/api/facturas',
  ADELANTOS: '/api/adelantos',
  PROFORMAS: '/api/proformas',
  CHOFERES: '/api/choferes',
  CONFIGURACION: '/api/configuracion',
  DASHBOARD: '/api/dashboard',
  REPORTES: '/api/reportes',
  USUARIOS: '/api/usuarios',
}

export const EXCLUDED_AUTH_URLS = [
  API_ROUTES.LOGIN,
  API_ROUTES.REFRESH,
  '/api/recuperar-contrasena',
]

export const TASA_MINIMA = 3

export const PLAZO_COBRO_DEFAULT = 30
export const PLAZO_ACREDITACION_DEFAULT = 48
