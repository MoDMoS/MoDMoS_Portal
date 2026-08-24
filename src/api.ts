export type User = {
  id: string;
  email: string | null;
  username: string | null;
  name: string;
  roles: string[];
  permissions: string[];
};

export type AdminPermission = {
  id: string;
  code: string;
  name: string;
};

export type AdminRole = {
  id: string;
  code: string;
  name: string;
  isSystem: boolean;
  permissions: AdminPermission[];
};

export type AdminUser = {
  id: string;
  email: string | null;
  username: string | null;
  name: string;
  createdAt: string;
  roles: Array<{ id: string; code: string; name: string }>;
};

export type AdminDatabaseSummary = {
  id: string;
  name: string;
  configured: boolean;
  connected: boolean;
  tableCount: number | null;
  error: string | null;
};

export type AdminDatabaseTable = {
  schema: string;
  name: string;
  rowEstimate: number | null;
};

export type AdminDatabaseRows = {
  schema: string;
  table: string;
  columns: string[];
  rows: Record<string, unknown>[];
  page: number;
  limit: number;
  total: number | null;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const data = (await response.json().catch(() => ({}))) as {
    message?: string | string[];
  };

  if (!response.ok) {
    const message = Array.isArray(data.message)
      ? data.message.join(', ')
      : data.message ||
        (response.status === 401
          ? 'กรุณาเข้าสู่ระบบ'
          : response.status === 403
            ? 'ไม่มีสิทธิ์เข้าถึง'
            : 'เกิดข้อผิดพลาด');
    throw new Error(message);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export function hasPermission(user: User | null | undefined, code: string) {
  return Boolean(user?.permissions?.includes(code));
}

export function portalLoginPath(next?: string) {
  if (!next) return '/login';
  return `/login?next=${encodeURIComponent(next)}`;
}

export function resolveNext(defaultPath = '/') {
  const params = new URLSearchParams(window.location.search);
  const next = params.get('next');
  if (!next) return defaultPath;
  try {
    const url = new URL(next, window.location.origin);
    if (url.origin !== window.location.origin) return defaultPath;
    return `${url.pathname}${url.search}${url.hash}` || defaultPath;
  } catch {
    return defaultPath;
  }
}
