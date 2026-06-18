/**
 * Enterprise RBAC: role-based access control
 * Roles: owner (full), admin (full except owner management), manager, accountant, sales, viewer
 */
const ROLES = {
  owner: 'owner',
  admin: 'admin',
  manager: 'manager',
  accountant: 'accountant',
  sales: 'sales',
  viewer: 'viewer',
};

const RESOURCES = {
  dashboard: 'dashboard',
  client: 'client',
  product: 'product',
  invoice: 'invoice',
  quote: 'quote',
  payment: 'payment',
  paymentMode: 'paymentMode',
  taxes: 'taxes',
  setting: 'setting',
  admin: 'admin',
  auditLog: 'auditLog',
};

const ACTIONS = { create: 'create', read: 'read', update: 'update', delete: 'delete', list: 'list', manage: 'manage' };

// Role hierarchy: higher index = more power. owner can do everything.
const ROLE_ORDER = [ROLES.viewer, ROLES.sales, ROLES.accountant, ROLES.manager, ROLES.admin, ROLES.owner];

// Resource:action allowed per role. manage = full CRUD + special actions.
const ROLE_PERMISSIONS = {
  [ROLES.owner]: {
    [RESOURCES.dashboard]: [ACTIONS.read, ACTIONS.list],
    [RESOURCES.client]: [ACTIONS.create, ACTIONS.read, ACTIONS.update, ACTIONS.delete, ACTIONS.list],
    [RESOURCES.product]: [ACTIONS.create, ACTIONS.read, ACTIONS.update, ACTIONS.delete, ACTIONS.list, ACTIONS.manage],
    [RESOURCES.invoice]: [ACTIONS.create, ACTIONS.read, ACTIONS.update, ACTIONS.delete, ACTIONS.list, ACTIONS.manage],
    [RESOURCES.quote]: [ACTIONS.create, ACTIONS.read, ACTIONS.update, ACTIONS.delete, ACTIONS.list, ACTIONS.manage],
    [RESOURCES.payment]: [ACTIONS.create, ACTIONS.read, ACTIONS.update, ACTIONS.delete, ACTIONS.list],
    [RESOURCES.paymentMode]: [ACTIONS.create, ACTIONS.read, ACTIONS.update, ACTIONS.delete, ACTIONS.list],
    [RESOURCES.taxes]: [ACTIONS.create, ACTIONS.read, ACTIONS.update, ACTIONS.delete, ACTIONS.list],
    [RESOURCES.setting]: [ACTIONS.create, ACTIONS.read, ACTIONS.update, ACTIONS.list, ACTIONS.manage],
    [RESOURCES.admin]: [ACTIONS.create, ACTIONS.read, ACTIONS.update, ACTIONS.delete, ACTIONS.list, ACTIONS.manage],
    [RESOURCES.auditLog]: [ACTIONS.read, ACTIONS.list],
  },
  [ROLES.admin]: {
    [RESOURCES.dashboard]: [ACTIONS.read, ACTIONS.list],
    [RESOURCES.client]: [ACTIONS.create, ACTIONS.read, ACTIONS.update, ACTIONS.delete, ACTIONS.list],
    [RESOURCES.product]: [ACTIONS.create, ACTIONS.read, ACTIONS.update, ACTIONS.delete, ACTIONS.list, ACTIONS.manage],
    [RESOURCES.invoice]: [ACTIONS.create, ACTIONS.read, ACTIONS.update, ACTIONS.delete, ACTIONS.list, ACTIONS.manage],
    [RESOURCES.quote]: [ACTIONS.create, ACTIONS.read, ACTIONS.update, ACTIONS.delete, ACTIONS.list, ACTIONS.manage],
    [RESOURCES.payment]: [ACTIONS.create, ACTIONS.read, ACTIONS.update, ACTIONS.delete, ACTIONS.list],
    [RESOURCES.paymentMode]: [ACTIONS.create, ACTIONS.read, ACTIONS.update, ACTIONS.delete, ACTIONS.list],
    [RESOURCES.taxes]: [ACTIONS.create, ACTIONS.read, ACTIONS.update, ACTIONS.delete, ACTIONS.list],
    [RESOURCES.setting]: [ACTIONS.create, ACTIONS.read, ACTIONS.update, ACTIONS.list, ACTIONS.manage],
    [RESOURCES.admin]: [ACTIONS.create, ACTIONS.read, ACTIONS.update, ACTIONS.list], // cannot delete owner or change owner role
    [RESOURCES.auditLog]: [ACTIONS.read, ACTIONS.list],
  },
  [ROLES.manager]: {
    [RESOURCES.dashboard]: [ACTIONS.read, ACTIONS.list],
    [RESOURCES.client]: [ACTIONS.create, ACTIONS.read, ACTIONS.update, ACTIONS.list],
    [RESOURCES.product]: [ACTIONS.create, ACTIONS.read, ACTIONS.update, ACTIONS.list, ACTIONS.manage],
    [RESOURCES.invoice]: [ACTIONS.create, ACTIONS.read, ACTIONS.update, ACTIONS.list, ACTIONS.manage],
    [RESOURCES.quote]: [ACTIONS.create, ACTIONS.read, ACTIONS.update, ACTIONS.list, ACTIONS.manage],
    [RESOURCES.payment]: [ACTIONS.read, ACTIONS.list],
    [RESOURCES.paymentMode]: [ACTIONS.read, ACTIONS.list],
    [RESOURCES.taxes]: [ACTIONS.read, ACTIONS.list],
    [RESOURCES.setting]: [ACTIONS.read, ACTIONS.list],
    [RESOURCES.admin]: [],
    [RESOURCES.auditLog]: [],
  },
  [ROLES.accountant]: {
    [RESOURCES.dashboard]: [ACTIONS.read, ACTIONS.list],
    [RESOURCES.client]: [ACTIONS.read, ACTIONS.list],
    [RESOURCES.product]: [ACTIONS.read, ACTIONS.list],
    [RESOURCES.invoice]: [ACTIONS.create, ACTIONS.read, ACTIONS.update, ACTIONS.list, ACTIONS.manage],
    [RESOURCES.quote]: [ACTIONS.read, ACTIONS.list],
    [RESOURCES.payment]: [ACTIONS.create, ACTIONS.read, ACTIONS.update, ACTIONS.list],
    [RESOURCES.paymentMode]: [ACTIONS.read, ACTIONS.list],
    [RESOURCES.taxes]: [ACTIONS.read, ACTIONS.list],
    [RESOURCES.setting]: [ACTIONS.read, ACTIONS.list],
    [RESOURCES.admin]: [],
    [RESOURCES.auditLog]: [],
  },
  [ROLES.sales]: {
    [RESOURCES.dashboard]: [ACTIONS.read, ACTIONS.list],
    [RESOURCES.client]: [ACTIONS.create, ACTIONS.read, ACTIONS.update, ACTIONS.list],
    [RESOURCES.product]: [ACTIONS.read, ACTIONS.list],
    [RESOURCES.invoice]: [ACTIONS.read, ACTIONS.list],
    [RESOURCES.quote]: [ACTIONS.create, ACTIONS.read, ACTIONS.update, ACTIONS.list, ACTIONS.manage],
    [RESOURCES.payment]: [ACTIONS.read, ACTIONS.list],
    [RESOURCES.paymentMode]: [ACTIONS.read, ACTIONS.list],
    [RESOURCES.taxes]: [ACTIONS.read, ACTIONS.list],
    [RESOURCES.setting]: [ACTIONS.read, ACTIONS.list],
    [RESOURCES.admin]: [],
    [RESOURCES.auditLog]: [],
  },
  [ROLES.viewer]: {
    [RESOURCES.dashboard]: [ACTIONS.read, ACTIONS.list],
    [RESOURCES.client]: [ACTIONS.read, ACTIONS.list],
    [RESOURCES.product]: [ACTIONS.read, ACTIONS.list],
    [RESOURCES.invoice]: [ACTIONS.read, ACTIONS.list],
    [RESOURCES.quote]: [ACTIONS.read, ACTIONS.list],
    [RESOURCES.payment]: [ACTIONS.read, ACTIONS.list],
    [RESOURCES.paymentMode]: [ACTIONS.read, ACTIONS.list],
    [RESOURCES.taxes]: [ACTIONS.read, ACTIONS.list],
    [RESOURCES.setting]: [ACTIONS.read, ACTIONS.list],
    [RESOURCES.admin]: [],
    [RESOURCES.auditLog]: [],
  },
};

function hasPermission(role, resource, action) {
  if (!role || !ROLE_PERMISSIONS[role]) return false;
  const perms = ROLE_PERMISSIONS[role][resource];
  if (!perms) return false;
  if (perms.includes(ACTIONS.manage)) return true;
  return perms.includes(action);
}

function canManageUsers(role) {
  return hasPermission(role, RESOURCES.admin, ACTIONS.list);
}

function canAccessAuditLog(role) {
  return hasPermission(role, RESOURCES.auditLog, ACTIONS.list);
}

function canAccessSettings(role) {
  return hasPermission(role, RESOURCES.setting, ACTIONS.read);
}

module.exports = {
  ROLES,
  RESOURCES,
  ACTIONS,
  ROLE_ORDER,
  ROLE_PERMISSIONS,
  hasPermission,
  canManageUsers,
  canAccessAuditLog,
  canAccessSettings,
};
