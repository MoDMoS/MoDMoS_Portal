import {
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { Navigate, NavLink } from 'react-router-dom';
import { hasPermission, portalLoginPath } from '../api';
import { useAuth } from '../auth';
import { PortalTopBar } from '../PortalTopBar';

export type AdminSection = 'users' | 'roles' | 'databases';

const STORAGE_KEY = 'portal-admin-nav-open';

const NAV: Array<{ id: AdminSection; label: string; to: string; icon: ReactNode }> = [
  { id: 'users', label: 'ผู้ใช้', to: '/admin', icon: <UsersIcon /> },
  { id: 'roles', label: 'Roles', to: '/admin/roles', icon: <RolesIcon /> },
  { id: 'databases', label: 'Databases', to: '/admin/databases', icon: <DatabaseIcon /> },
];

function readOpen() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return true;
    return raw === '1';
  } catch {
    return true;
  }
}

const linkClass = (open: boolean) =>
  ({ isActive }: { isActive: boolean }) =>
    [
      'app-sidebar__link',
      open ? 'app-sidebar__link--open' : 'app-sidebar__link--collapsed',
      isActive ? 'app-sidebar__link--active' : '',
    ]
      .filter(Boolean)
      .join(' ');

export function useAdminGate(nextPath: string) {
  const auth = useAuth();
  const { user, loading } = auth;
  const allowed = Boolean(user && hasPermission(user, 'admin:access'));
  let redirect: ReactNode = null;
  if (!loading && !user) {
    redirect = <Navigate to={portalLoginPath(nextPath)} replace />;
  } else if (!loading && user && !allowed) {
    redirect = <Navigate to="/" replace />;
  }
  return { ...auth, allowed, redirect };
}

export function AdminShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(readOpen);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, open ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [open]);

  return (
    <div className="app-layout">
      <aside
        className={`app-sidebar ${open ? 'app-sidebar--open' : 'app-sidebar--collapsed'}`}
        aria-label="Admin navigation"
      >
        <div className="app-sidebar__head">
          {open ? <p className="app-sidebar__label">เมนู</p> : null}
          <button
            type="button"
            className="topbar-icon-btn"
            aria-label={open ? 'ปิดเมนู' : 'เปิดเมนู'}
            title={open ? 'ปิดเมนู' : 'เปิดเมนู'}
            onClick={() => setOpen((prev) => !prev)}
          >
            {open ? <CollapseIcon /> : <MenuIcon />}
          </button>
        </div>

        <nav className="app-sidebar__nav">
          {NAV.map((item) => (
            <NavLink
              key={item.id}
              to={item.to}
              end={item.id === 'users'}
              className={linkClass(open)}
              title={item.label}
            >
              <span className="app-sidebar__icon">{item.icon}</span>
              {open ? <span className="app-sidebar__text">{item.label}</span> : null}
              <span className="app-sidebar__tooltip">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="app-main">
        <PortalTopBar title="MoDMoS" subtitle="Admin" />
        <main className="app-main__body">
          <div className="app-page">
            <div className="app-page__head">
              <div>
                <h1>{title}</h1>
                {description ? <p>{description}</p> : null}
              </div>
              {actions ? <div className="app-page__actions">{actions}</div> : null}
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarIcon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="app-sidebar__svg" aria-hidden="true">
      {children}
    </svg>
  );
}

function MenuIcon() {
  return (
    <SidebarIcon>
      <path
        d="M4 6h16M4 12h16M4 18h16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </SidebarIcon>
  );
}

function CollapseIcon() {
  return (
    <SidebarIcon>
      <path
        d="M15 6l-6 6 6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </SidebarIcon>
  );
}

function UsersIcon() {
  return (
    <SidebarIcon>
      <path
        d="M16 19v-1a4 4 0 00-4-4H8a4 4 0 00-4 4v1M12 11a4 4 0 100-8 4 4 0 000 8z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </SidebarIcon>
  );
}

function RolesIcon() {
  return (
    <SidebarIcon>
      <path
        d="M12 3l8 4v6c0 4.4-3.6 8-8 8s-8-3.6-8-8V7l8-4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </SidebarIcon>
  );
}

function DatabaseIcon() {
  return (
    <SidebarIcon>
      <ellipse cx="12" cy="6" rx="8" ry="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </SidebarIcon>
  );
}
