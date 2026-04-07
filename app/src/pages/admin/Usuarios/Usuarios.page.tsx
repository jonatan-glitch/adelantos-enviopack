import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import * as Yup from 'yup'
import { X, Shield, ShieldCheck, Eye, Pencil } from 'lucide-react'
import { Button } from '@enviopack/epic-ui'
import { toast } from 'react-toastify'
import api from '@/infrastructure/interceptors/api.interceptor'
import { useRoles } from '@/hooks/useRoles'
import { ROLES } from '@/domain/constants'
import DataTable from '@/components/DataTable/DataTable'
import { StatusBadge } from '@/components/StatusBadge/StatusBadge'
import styles from './Usuarios.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminUser {
  id: number
  nombre: string
  apellido: string
  email: string
  roles: string[]
  habilitado: boolean
  created_at: string
}

interface RoleOption {
  value: string
  label: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  ROLE_ENVIOPACK_ADMIN: 'Super Admin',
  ROLE_OWNER: 'Owner',
  ROLE_ADMINISTRADOR: 'Administrador',
  ROLE_SUPERVISOR: 'Supervisor Operativo',
}

const ROLE_ICONS: Record<string, React.ReactNode> = {
  ROLE_ENVIOPACK_ADMIN: <ShieldCheck size={14} />,
  ROLE_OWNER: <ShieldCheck size={14} />,
  ROLE_ADMINISTRADOR: <Shield size={14} />,
  ROLE_SUPERVISOR: <Eye size={14} />,
}

function primaryRole(roles: string[]): string {
  const priority = ['ROLE_ENVIOPACK_ADMIN', 'ROLE_OWNER', 'ROLE_ADMINISTRADOR', 'ROLE_SUPERVISOR']
  for (const r of priority) {
    if (roles.includes(r)) return r
  }
  return roles[0] ?? 'ROLE_USUARIO'
}

// ─── Validation ───────────────────────────────────────────────────────────────

const inviteSchema = Yup.object({
  email: Yup.string()
    .email('El email no es válido')
    .required('El email es obligatorio'),
  rol: Yup.string()
    .required('Seleccioná un rol'),
})

// ═══════════════════════════════════════════════════════════════════════════════
// ── Page ──────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export const UsuariosPage = () => {
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const { hasRole } = useRoles()
  const isSuperAdmin = hasRole(ROLES.ENVIOPACK_ADMIN)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-usuarios'],
    queryFn: async () => {
      const res = await api.get<{ data: { items: AdminUser[] } }>('/api/admin/usuarios')
      return res.data.data.items
    },
  })

  const columns = [
    {
      key: 'nombre',
      title: 'Nombre',
      render: (u: AdminUser) => (
        <div>
          <p style={{ fontWeight: 600 }}>{u.nombre} {u.apellido}</p>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)' }}>
            {u.email}
          </p>
        </div>
      ),
    },
    {
      key: 'rol',
      title: 'Rol',
      render: (u: AdminUser) => {
        const role = primaryRole(u.roles)
        return (
          <span className={styles.roleBadge} data-role={role}>
            {ROLE_ICONS[role]}
            {ROLE_LABELS[role] ?? role}
          </span>
        )
      },
    },
    {
      key: 'habilitado',
      title: 'Estado',
      render: (u: AdminUser) =>
        u.habilitado
          ? <StatusBadge label="Activo" variant="success" />
          : <StatusBadge label="Deshabilitado" variant="neutral" />,
    },
    {
      key: 'created_at',
      title: 'Alta',
      render: (u: AdminUser) => {
        const d = new Date(u.created_at)
        return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      },
    },
    ...(isSuperAdmin
      ? [
          {
            key: 'acciones',
            title: 'Acciones',
            render: (u: AdminUser) => {
              const role = primaryRole(u.roles)
              // No permitir editar el super admin
              if (role === 'ROLE_ENVIOPACK_ADMIN') return null
              return (
                <button
                  className={styles.editRoleBtn}
                  title="Cambiar rol"
                  onClick={() => setEditingUser(u)}
                >
                  <Pencil size={14} />
                  Cambiar rol
                </button>
              )
            },
          },
        ]
      : []),
  ]

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Usuarios</h1>
          <p className={styles.pageSubtitle}>Gestión del equipo con acceso a la plataforma</p>
        </div>

        {isSuperAdmin && (
          <div className={styles.headerActions}>
            <Button
              label="Invitar usuario"
              icon="user-linear"
              variant="solid"
              color="blue"
              size="md"
              onClick={() => setShowInviteModal(true)}
            />
          </div>
        )}
      </div>

      <DataTable
        columns={columns}
        data={data ?? []}
        keyExtractor={(u) => u.id}
        loading={isLoading}
        emptyTitle="Sin usuarios"
        emptyMessage="Invitá al primer usuario del equipo."
      />

      {showInviteModal && (
        <InviteUserModal onClose={() => setShowInviteModal(false)} />
      )}

      {editingUser && (
        <ChangeRoleModal user={editingUser} onClose={() => setEditingUser(null)} />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Modal: Invitar usuario ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

const InviteUserModal = ({ onClose }: { onClose: () => void }) => {
  const qc = useQueryClient()

  const { data: rolesData } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: async () => {
      const res = await api.get<{ data: { roles: RoleOption[] } }>('/api/admin/usuarios/roles')
      return res.data.data.roles
    },
  })

  const inviteMutation = useMutation({
    mutationFn: (values: { email: string; rol: string }) =>
      api.post('/api/admin/usuarios/invitar', values),
    onSuccess: () => {
      toast.success('Invitación enviada. El usuario recibirá un email para completar su registro.')
      qc.invalidateQueries({ queryKey: ['admin-usuarios'] })
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'No se pudo enviar la invitación.'
      toast.error(msg)
    },
  })

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Invitar usuario</h3>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <Formik
          initialValues={{ email: '', rol: '' }}
          validationSchema={inviteSchema}
          onSubmit={(values) => inviteMutation.mutate(values)}
        >
          <Form>
            <div className={styles.modalBody}>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)', lineHeight: 1.6 }}>
                El usuario recibirá un email con un enlace para completar su registro: nombre, apellido y contraseña.
              </p>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="invite-email">Email *</label>
                <Field
                  id="invite-email"
                  name="email"
                  type="email"
                  className={styles.input}
                  placeholder="usuario@enviopack.com"
                  autoFocus
                />
                <ErrorMessage name="email" component="p" className={styles.error} />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="invite-rol">Rol *</label>
                <Field
                  id="invite-rol"
                  name="rol"
                  as="select"
                  className={styles.input}
                >
                  <option value="">Seleccioná un rol</option>
                  {rolesData?.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </Field>
                <ErrorMessage name="rol" component="p" className={styles.error} />
              </div>

              <div className={styles.roleHints}>
                <div className={styles.roleHint}>
                  <ShieldCheck size={14} color="var(--color-accent)" />
                  <div>
                    <strong>Owner / Administrador</strong>
                    <p>Acceso completo: crear proformas, gestionar facturas, aprobar adelantos, configurar sistema.</p>
                  </div>
                </div>
                <div className={styles.roleHint}>
                  <Eye size={14} color="var(--color-warning)" />
                  <div>
                    <strong>Supervisor Operativo</strong>
                    <p>Solo lectura: puede ver solicitudes, facturas, reportes e invitar choferes. No puede crear proformas ni aprobar pagos.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <Button
                type="button"
                label="Cancelar"
                variant="outline"
                color="gray"
                onClick={onClose}
              />
              <Button
                type="submit"
                label={inviteMutation.isPending ? 'Enviando...' : 'Enviar invitación'}
                variant="solid"
                color="blue"
                loading={inviteMutation.isPending}
                disabled={inviteMutation.isPending}
              />
            </div>
          </Form>
        </Formik>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Modal: Cambiar rol ────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

const ChangeRoleModal = ({ user, onClose }: { user: AdminUser; onClose: () => void }) => {
  const qc = useQueryClient()
  const currentRole = primaryRole(user.roles)

  const { data: rolesData } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: async () => {
      const res = await api.get<{ data: { roles: RoleOption[] } }>('/api/admin/usuarios/roles')
      return res.data.data.roles
    },
  })

  const changeRoleMutation = useMutation({
    mutationFn: (rol: string) =>
      api.put(`/api/admin/usuarios/${user.id}/cambiar-rol`, { rol }),
    onSuccess: () => {
      toast.success(`Rol de ${user.nombre} ${user.apellido} actualizado correctamente.`)
      qc.invalidateQueries({ queryKey: ['admin-usuarios'] })
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'No se pudo cambiar el rol.'
      toast.error(msg)
    },
  })

  const changeRoleSchema = Yup.object({
    rol: Yup.string()
      .required('Seleccioná un rol')
      .notOneOf([currentRole], 'Seleccioná un rol diferente al actual'),
  })

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Cambiar rol</h3>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <Formik
          initialValues={{ rol: currentRole }}
          validationSchema={changeRoleSchema}
          onSubmit={(values) => changeRoleMutation.mutate(values.rol)}
        >
          <Form>
            <div className={styles.modalBody}>
              <div className={styles.userInfo}>
                <p className={styles.userInfoName}>{user.nombre} {user.apellido}</p>
                <p className={styles.userInfoEmail}>{user.email}</p>
                <span className={styles.roleBadge} data-role={currentRole} style={{ marginTop: 4 }}>
                  {ROLE_ICONS[currentRole]}
                  Rol actual: {ROLE_LABELS[currentRole] ?? currentRole}
                </span>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="change-rol">Nuevo rol *</label>
                <Field
                  id="change-rol"
                  name="rol"
                  as="select"
                  className={styles.input}
                >
                  {rolesData?.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </Field>
                <ErrorMessage name="rol" component="p" className={styles.error} />
              </div>

              <div className={styles.roleHints}>
                <div className={styles.roleHint}>
                  <ShieldCheck size={14} color="var(--color-accent)" />
                  <div>
                    <strong>Owner / Administrador</strong>
                    <p>Acceso completo: crear proformas, gestionar facturas, aprobar adelantos, configurar sistema.</p>
                  </div>
                </div>
                <div className={styles.roleHint}>
                  <Eye size={14} color="var(--color-warning)" />
                  <div>
                    <strong>Supervisor Operativo</strong>
                    <p>Solo lectura: puede ver solicitudes, facturas, reportes e invitar choferes. No puede crear proformas ni aprobar pagos.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <Button
                type="button"
                label="Cancelar"
                variant="outline"
                color="gray"
                onClick={onClose}
              />
              <Button
                type="submit"
                label={changeRoleMutation.isPending ? 'Guardando...' : 'Guardar cambio'}
                variant="solid"
                color="blue"
                loading={changeRoleMutation.isPending}
                disabled={changeRoleMutation.isPending}
              />
            </div>
          </Form>
        </Formik>
      </div>
    </div>
  )
}
