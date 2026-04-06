// ─── Auth ───────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string
  contrasena: string
  recordar?: boolean
}

export interface AuthTokens {
  token: string
  refresh_token: string
}

export interface JwtPayload {
  id: number
  email: string
  roles: string[]
  id_sesion: number
  exp: number
}

// ─── Usuario ─────────────────────────────────────────────────────────────────

export interface Usuario {
  id: number
  nombre: string
  apellido: string
  email: string
  roles: string[]
  habilitado: boolean
  tasa_personal?: number | null
}

// ─── Chofer ───────────────────────────────────────────────────────────────────

export interface PerfilChofer {
  id: number
  nombre: string
  apellido: string
  email: string
  dni: string
  cuil: string
  telefono?: string | null
  cbu?: string | null
  banco?: string | null
}

export interface Chofer {
  id: number
  nombre: string
  apellido: string
  dni: string
  cuil: string
  email: string
  telefono?: string
  habilitado: boolean
  tasa_personal?: number | null
  tiene_deuda: boolean
  created_at: string
}

// ─── Proforma ─────────────────────────────────────────────────────────────────

export interface Proforma {
  id: number
  chofer: Pick<Chofer, 'id' | 'nombre' | 'apellido' | 'dni'>
  periodo: string
  monto: number
  tasa_aplicada: number
  fecha_vencimiento: string
  descripcion?: string
  estado: EstadoProforma
  created_at: string
}

export type EstadoProforma = 'pendiente' | 'facturada' | 'vencida'

// ─── Factura ──────────────────────────────────────────────────────────────────

export type EstadoFactura =
  | 'pendiente_cobro'
  | 'con_adelanto_solicitado'
  | 'adelanto_aprobado'
  | 'adelanto_pagado'
  | 'adelanto_rechazado'
  | 'cobro_normal'
  | 'pagada_cobro_normal'
  | 'rechazada'

export interface Factura {
  id: number
  numero_factura: string
  chofer: Pick<Chofer, 'id' | 'nombre' | 'apellido' | 'dni'>
  proforma?: Pick<Proforma, 'id' | 'monto' | 'periodo'>
  monto_bruto: number
  monto_nota_credito?: number | null
  monto_neto: number
  fecha_emision: string
  fecha_cobro_estimada: string
  estado: EstadoFactura
  archivo_factura_url?: string
  archivo_nota_credito_url?: string
  comprobante_pago_url?: string | null
  fecha_pago?: string | null
  motivo_rechazo?: string | null
  opcion_cobro: 'normal' | 'adelanto'
  created_at: string
}

// ─── Solicitud de Adelanto ────────────────────────────────────────────────────

export type EstadoSolicitud = 'en_revision' | 'aprobada' | 'rechazada' | 'pagada'
export type TipoAprobacion = 'automatica' | 'manual'

export interface SolicitudAdelanto {
  id: number
  factura: Pick<Factura, 'id' | 'numero_factura' | 'monto_bruto'>
  chofer: Pick<Chofer, 'id' | 'nombre' | 'apellido' | 'dni'>
  tasa_aplicada: number
  monto_bruto: number
  monto_descontado: number
  monto_neto: number
  estado: EstadoSolicitud
  tipo_aprobacion?: TipoAprobacion
  fecha_solicitud: string
  fecha_aprobacion?: string
  fecha_pago?: string
  motivo_rechazo?: string
  aprobado_por?: string
  comprobante_pago_url?: string
  consentimiento_ip: string
  consentimiento_fecha: string
}

// ─── Configuración ────────────────────────────────────────────────────────────

export interface ConfiguracionSistema {
  tasa_global: number
  dias_cobro_normal: number
  plazo_acreditacion_horas: number
  emails_notificacion_admin: string[]
}

export interface HistorialTasa {
  id: number
  chofer_id?: number
  tasa: number
  tipo: 'global' | 'personal'
  fecha_vigencia: string
  usuario_responsable: string
}

// ─── Dashboard / KPIs ────────────────────────────────────────────────────────

export interface DashboardChofer {
  facturas_disponibles: number
  adelantos_pendientes: number
  total_facturado: number
  total_adelantado: number
}

export interface DashboardAdmin {
  monto_total_facturado: number
  descuentos_obtenidos: number
  choferes_total: number
  choferes_con_adelanto: number
  tasa_promedio: number
  solicitudes_pendientes: number
  tiempo_promedio_aprobacion_horas: number
}

// ─── Paginación ───────────────────────────────────────────────────────────────

export interface Paginate {
  total: number
  pagina: number
  paginas: number
  ppp: number
}

export interface ApiResponseList<T> {
  data: {
    items: T[]
    paginate: Paginate
  }
}

export interface ApiResponse<T = unknown> {
  data: T
}

export interface ApiError {
  code: number
  message: string
  errors?: Record<string, string>
}

// ─── Filtros comunes ──────────────────────────────────────────────────────────

export interface PaginationParams {
  page: number
  limit: number
}

export interface FacturaFilters extends PaginationParams {
  estado?: EstadoFactura
  chofer_id?: number
  fecha_desde?: string
  fecha_hasta?: string
}

export interface SolicitudFilters extends PaginationParams {
  estado?: EstadoSolicitud
  chofer_id?: number
  fecha_desde?: string
  fecha_hasta?: string
}
