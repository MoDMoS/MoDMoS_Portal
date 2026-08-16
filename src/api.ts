export type User = {
  id: string;
  email: string;
  name: string;
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
      : data.message || (response.status === 401 ? 'กรุณาเข้าสู่ระบบ' : 'เกิดข้อผิดพลาด');
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
};

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
