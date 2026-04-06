import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, ExternalLink, FileCheck } from 'lucide-react'
import { Button } from '@enviopack/epic-ui'
import api from '@/infrastructure/interceptors/api.interceptor'
import type { Factura } from '@/domain/models'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const resolveFileUrl = (url: string | null | undefined) => {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return `${API_URL}${url}`
}
import DataTable from '@/components/DataTable/DataTable'
import { StatusBadge, estadoFacturaAdminLabel, estadoFacturaAdminVariant } from '@/components/StatusBadge/StatusBadge'
import dayjs from 'dayjs'
import { toast } from 'react-toastify'
import styles from './Facturas.module.css'

const formatCurrency = (n: number) =>
  n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

type GrupoFilter = '' | 'recibidas' | 'en_proceso' | 'pagas' | 'rechazadas'

const grupoLabels: Record<GrupoFilter, string> = {
  '': 'Todas',
  recibidas: 'Recibidas',
  en_proceso: 'En proceso',
  pagas: 'Pagas',
  rechazadas: 'Rechazadas',
}

export const FacturasAdminPage = () => {
  const [grupoFilter, setGrupoFilter] = useState<GrupoFilter>('recibidas')
  const [abonarModal, setAbonarModal] = useState<Factura | null>(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-facturas', grupoFilter],
    queryFn: async () => {
      const params = grupoFilter ? `grupo=${grupoFilter}&` : ''
      const res = await api.get<{ data: { items: Factura[] } }>(
        `/api/admin/facturas?${params}page=1&limit=100`
      )
      return res.data.data.items
    },
  })

  const columns = [
    {
      key: 'chofer',
      title: 'Chofer',
      render: (f: Factura) => (
        <div>
          <p style={{ fontWeight: 600 }}>{f.chofer.nombre} {f.chofer.apellido}</p>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)' }}>
            DNI {f.chofer.dni}
          </p>
        </div>
      ),
    },
    {
      key: 'numero_factura',
      title: 'N° Factura',
      render: (f: Factura) => `#${f.numero_factura}`,
    },
    {
      key: 'monto_bruto',
      title: 'Monto bruto',
      render: (f: Factura) => formatCurrency(f.monto_bruto),
    },
    {
      key: 'monto_neto',
      title: 'Monto neto',
      render: (f: Factura) => (
        <strong style={{ color: 'var(--color-accent)' }}>{formatCurrency(f.monto_neto)}</strong>
      ),
    },
    {
      key: 'opcion_cobro',
      title: 'Tipo cobro',
      render: (f: Factura) =>
        f.opcion_cobro === 'adelanto'
          ? <span className={styles.badgeAdelanto}>Adelanto 48hs</span>
          : <span className={styles.badgeNormal}>Normal 30d</span>,
    },
    {
      key: 'fecha',
      title: 'Fecha',
      render: (f: Factura) => dayjs(f.created_at).format('DD/MM/YY'),
    },
    {
      key: 'estado',
      title: 'Estado',
      render: (f: Factura) => (
        <StatusBadge
          label={estadoFacturaAdminLabel[f.estado]}
          variant={estadoFacturaAdminVariant[f.estado]}
        />
      ),
    },
    {
      key: 'acciones',
      title: 'Acciones',
      render: (f: Factura) => (
        <div style={{ display: 'flex', gap: 6 }}>
          {f.estado === 'cobro_normal' && (
            <Button
              label="Abonar"
              icon="archive-up-arrow-linear"
              variant="solid"
              color="blue"
              size="sm"
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); setAbonarModal(f) }}
            />
          )}
          {f.archivo_factura_url && (
            <button
              className={styles.actionBtn}
              onClick={(e) => {
                e.stopPropagation()
                window.open(resolveFileUrl(f.archivo_factura_url), '_blank')
              }}
            >
              <ExternalLink size={14} /> Ver factura
            </button>
          )}
          {(f.estado === 'pagada_cobro_normal' || f.estado === 'adelanto_pagado') && f.comprobante_pago_url && (
            <button
              className={styles.actionBtn}
              style={{ borderColor: '#16a34a', color: '#16a34a' }}
              onClick={(e) => {
                e.stopPropagation()
                window.open(resolveFileUrl(f.comprobante_pago_url), '_blank')
              }}
            >
              <FileCheck size={14} /> Comprobante
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Facturas recibidas</h1>
          <p className={styles.pageSubtitle}>Gestioná las facturas enviadas por los choferes</p>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        {(Object.keys(grupoLabels) as GrupoFilter[]).map((grupo) => (
          <button
            key={grupo}
            className={`${styles.filterTab} ${grupoFilter === grupo ? styles.filterTabActive : ''}`}
            onClick={() => setGrupoFilter(grupo)}
          >
            {grupoLabels[grupo]}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={data ?? []}
        keyExtractor={(f) => f.id}
        loading={isLoading}
        emptyTitle="Sin facturas"
        emptyMessage="No hay facturas que coincidan con el filtro seleccionado."
      />

      {abonarModal && (
        <AbonarModal
          factura={abonarModal}
          onClose={() => setAbonarModal(null)}
          onSuccess={() => {
            setAbonarModal(null)
            qc.invalidateQueries({ queryKey: ['admin-facturas'] })
          }}
        />
      )}
    </div>
  )
}

// ── Abonar Modal ─────────────────────────────────────────────────────────────

const AbonarModal = ({
  factura,
  onClose,
  onSuccess,
}: { factura: Factura; onClose: () => void; onSuccess: () => void }) => {
  const [file, setFile] = useState<File | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      let comprobanteUrl: string | null = null

      // Upload comprobante file first if provided
      if (file) {
        const fd = new FormData()
        fd.append('comprobante', file)
        const uploadRes = await api.post(`/api/admin/facturas/${factura.id}/comprobante`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        comprobanteUrl = uploadRes.data?.data?.comprobante_url ?? null
      }

      // Mark as paid
      await api.put(`/api/admin/facturas/${factura.id}/abonar`, {
        comprobante_url: comprobanteUrl,
      })
    },
    onSuccess: () => { toast.success('Pago registrado correctamente. El chofer fue notificado por email.'); onSuccess() },
    onError: () => toast.error('Error al registrar el pago'),
  })

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Abonar factura</h3>
          <button className={styles.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.resumen}>
            <div className={styles.resumenRow}>
              <span>Chofer</span>
              <strong>{factura.chofer.nombre} {factura.chofer.apellido}</strong>
            </div>
            <div className={styles.resumenRow}>
              <span>N° Factura</span>
              <strong>#{factura.numero_factura}</strong>
            </div>
            <div className={styles.resumenRow}>
              <span>Monto a pagar</span>
              <strong style={{ color: 'var(--color-accent)', fontSize: 'var(--font-size-lg)' }}>
                {formatCurrency(factura.monto_neto)}
              </strong>
            </div>
          </div>
          <div>
            <label className={styles.fieldLabel}>Comprobante de pago (PDF/imagen) *</label>
            <input
              type="file"
              accept=".pdf,image/*"
              className={styles.fileInput}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file && <p className={styles.fileName}>{file.name}</p>}
          </div>
        </div>
        <div className={styles.modalFooter}>
          <Button label="Cancelar" variant="outline" color="gray" onClick={onClose} />
          <Button
            label={mutation.isPending ? 'Registrando...' : 'Confirmar pago'}
            variant="solid"
            color="blue"
            loading={mutation.isPending}
            disabled={!file || mutation.isPending}
            onClick={() => mutation.mutate()}
          />
        </div>
      </div>
    </div>
  )
}
