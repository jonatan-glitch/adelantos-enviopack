import { Badge } from '@enviopack/epic-ui'
import type { EstadoFactura, EstadoSolicitud } from '@/domain/models'

type Variant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'orange'

interface Props {
  label: string
  variant: Variant
}

const variantToColor: Record<Variant, 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'orange'> = {
  success: 'green',
  warning: 'yellow',
  error: 'red',
  info: 'blue',
  neutral: 'gray',
  orange: 'orange',
}

export const StatusBadge = ({ label, variant }: Props) => (
  <Badge label={label} color={variantToColor[variant]} size="sm" isRounded />
)

// Helpers para facturas y solicitudes

export const estadoFacturaLabel: Record<EstadoFactura, string> = {
  pendiente_cobro: 'Pendiente de cobro',
  con_adelanto_solicitado: 'Adelanto solicitado',
  adelanto_aprobado: 'Adelanto aprobado',
  adelanto_pagado: 'Adelanto pagado',
  adelanto_rechazado: 'Adelanto rechazado',
  cobro_normal: 'Cobro normal',
  pagada_cobro_normal: 'Pagada',
}

export const estadoFacturaVariant: Record<EstadoFactura, Variant> = {
  pendiente_cobro: 'info',
  con_adelanto_solicitado: 'warning',
  adelanto_aprobado: 'success',
  adelanto_pagado: 'success',
  adelanto_rechazado: 'error',
  cobro_normal: 'neutral',
  pagada_cobro_normal: 'neutral',
}

export const estadoSolicitudLabel: Record<EstadoSolicitud, string> = {
  en_revision: 'En revisión',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
  pagada: 'Pagada',
}

export const estadoSolicitudVariant: Record<EstadoSolicitud, Variant> = {
  en_revision: 'warning',
  aprobada: 'success',
  rechazada: 'error',
  pagada: 'neutral',
}
