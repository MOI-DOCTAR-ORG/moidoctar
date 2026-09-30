/**
 * Mirror of backend/app/core/permissions.py.
 *
 * This is a convenience layer for deciding what to render. It is NOT a
 * security boundary: anyone can read the bundle and call the API directly, so
 * every route this gates is independently enforced on the server. Both files
 * must change together.
 */

export type Role = 'user' | 'staff' | 'admin'

export const ROLES: Role[] = ['user', 'staff', 'admin']

export type Permission =
  | 'admin:access'
  | 'tickets:read'
  | 'tickets:reply'
  | 'tickets:assign'
  | 'tickets:view_history'
  | 'users:read'
  | 'users:blacklist'
  | 'staff:manage'
  | 'ai:keys'
  | 'cache:clear'
  | 'audit:read'

const STAFF_PERMISSIONS: Permission[] = [
  'admin:access',
  'tickets:read',
  'tickets:reply',
  'tickets:assign',
  'tickets:view_history',
  'users:read',
]

const ADMIN_PERMISSIONS: Permission[] = [
  ...STAFF_PERMISSIONS,
  'users:blacklist',
  'staff:manage',
  'ai:keys',
  'cache:clear',
  'audit:read',
]

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  user: [],
  staff: STAFF_PERMISSIONS,
  admin: ADMIN_PERMISSIONS,
}

/** An unknown stored role collapses to `user`: a bad value costs access, never grants it. */
export function normalizeRole(value: unknown): Role {
  const role = String(value ?? '').trim().toLowerCase()
  return (ROLES as string[]).includes(role) ? (role as Role) : 'user'
}

export function permissionsFor(role: unknown): Permission[] {
  return ROLE_PERMISSIONS[normalizeRole(role)]
}

type RoleBearing = { role?: unknown } | null | undefined

export function can(user: RoleBearing, permission: Permission): boolean {
  if (!user) return false
  return permissionsFor(user.role).includes(permission)
}

/** Whether this user should see the admin console at all. */
export function isOperator(user: RoleBearing): boolean {
  return can(user, 'admin:access')
}

export const ROLE_LABELS: Record<Role, string> = {
  user: 'User',
  staff: 'Staff',
  admin: 'Admin',
}

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  user: 'Normal account. No access to the admin console.',
  staff: 'Answers tickets and views users. Cannot manage staff, AI keys, or the cache.',
  admin: 'Full control, including staff management and destructive operations.',
}
