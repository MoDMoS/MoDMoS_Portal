export const PERMISSION_CODES = {
  SERVICE_INVESTMENT: 'service:investment',
  SERVICE_GOLD_AGENT: 'service:gold-agent',
  SERVICE_DISCORD: 'service:discord',
  SERVICE_TRIP_PLANNER: 'service:trip-planner',
  ADMIN_ACCESS: 'admin:access',
} as const;

export type PermissionCode =
  (typeof PERMISSION_CODES)[keyof typeof PERMISSION_CODES];

export const ROLE_CODES = {
  ADMIN: 'admin',
  USER: 'user',
} as const;

export const PERMISSION_CATALOG: Array<{ code: PermissionCode; name: string }> =
  [
    { code: PERMISSION_CODES.SERVICE_INVESTMENT, name: 'เข้าถึง Investment' },
    { code: PERMISSION_CODES.SERVICE_GOLD_AGENT, name: 'เข้าถึง Gold Agent' },
    {
      code: PERMISSION_CODES.SERVICE_DISCORD,
      name: 'ดูสถานะ Discord Bot',
    },
    {
      code: PERMISSION_CODES.SERVICE_TRIP_PLANNER,
      name: 'เข้าถึง Trip Planner',
    },
    { code: PERMISSION_CODES.ADMIN_ACCESS, name: 'จัดการ Admin / RBAC' },
  ];
