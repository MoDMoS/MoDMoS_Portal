import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { Link, Navigate, NavLink, Outlet } from 'react-router-dom';
import { hasPermission, portalLoginPath } from '../../api';
import { useAuth } from '../../auth';
import { PortalTopBar } from '../../PortalTopBar';
import {
  fetchJson,
  formatUptime,
  type DiscordOutletContext,
  type DiscordStatus,
} from './shared';

const STORAGE_KEY = 'portal-discord-nav-open';

type NavItem = { id: string; label: string; to: string; end?: boolean; icon: ReactNode };

const NAV: NavItem[] = [
  { id: 'announcements', label: 'ประกาศ', to: '/discord/announcements', icon: <AnnounceIcon /> },
  { id: 'roster', label: 'สมาชิก', to: '/discord/roster', icon: <RosterIcon /> },
  { id: 'logs', label: 'ล็อก', to: '/discord/logs', icon: <LogsIcon /> },
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

export function DiscordLayout() {
  const { user, loading } = useAuth();
  const canView = hasPermission(user, 'service:discord') || hasPermission(user, 'admin:access');

  const [open, setOpen] = useState(readOpen);
  const [status, setStatus] = useState<DiscordStatus | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, open ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [open]);

  const loadStatus = useCallback(async () => {
    setRefreshing(true);
    setError('');
    try {
      setStatus(await fetchJson<DiscordStatus>('/discord-api/status'));
    } catch (err) {
      setStatus(null);
      setError(err instanceof Error ? err.message : 'โหลดสถานะไม่สำเร็จ');
    } finally {
      setRefreshing(false);
    }
  }, []);

  const requestRefresh = useCallback(() => {
    setRefreshTick((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!loading && user && canView) {
      void loadStatus();
      const id = window.setInterval(() => void loadStatus(), 15_000);
      return () => window.clearInterval(id);
    }
  }, [loading, user, canView, loadStatus, refreshTick]);

  if (!loading && !user) {
    return <Navigate to={portalLoginPath('/discord')} replace />;
  }

  if (!loading && user && !canView) {
    return <Navigate to="/" replace />;
  }

  const outletCtx: DiscordOutletContext = {
    refreshTick,
    refreshing,
    requestRefresh,
  };

  return (
    <div className="app-layout">
      <aside
        className={`app-sidebar ${open ? 'app-sidebar--open' : 'app-sidebar--collapsed'}`}
        aria-label="Discord navigation"
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
              end={item.end}
              className={linkClass(open)}
              title={item.label}
            >
              <span className="app-sidebar__icon">{item.icon}</span>
              {open ? <span className="app-sidebar__text">{item.label}</span> : null}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="app-main">
        <PortalTopBar title="MoDMoS" subtitle="Discord Bot" />
        <main className="app-main__body">
          <div className="app-page discord-page">
            <div className="app-page__head">
              <div>
                <h1>Discord Bot</h1>
                <p>สถานะ runtime บน VPS (พอร์ต 3000) — รีเฟรชอัตโนมัติทุก 15 วินาที</p>
              </div>
              <div className="app-page__actions">
                <Link to="/" className="btn-ghost">
                  ← กลับ Portal
                </Link>
                <button
                  type="button"
                  className="discord-refresh"
                  onClick={() => {
                    requestRefresh();
                    void loadStatus();
                  }}
                  disabled={refreshing}
                >
                  {refreshing ? 'กำลังโหลด…' : 'รีเฟรช'}
                </button>
              </div>
            </div>

            {error ? <p className="form-error">{error}</p> : null}

            {status ? (
              <ul className="discord-stats">
                <li>
                  <span>Discord</span>
                  <strong className={status.discordReady ? 'ok' : 'bad'}>
                    {status.discordReady ? 'Ready' : 'Offline'}
                  </strong>
                </li>
                <li>
                  <span>Neon DB</span>
                  <strong className={status.dbOk ? 'ok' : 'bad'}>
                    {status.dbOk ? 'Connected' : 'Down'}
                  </strong>
                </li>
                <li>
                  <span>Bot</span>
                  <strong>{status.botTag ?? '—'}</strong>
                </li>
                <li>
                  <span>Guilds</span>
                  <strong>{status.guildCount}</strong>
                </li>
                <li>
                  <span>Uptime</span>
                  <strong>{formatUptime(status.uptimeSec)}</strong>
                </li>
                <li>
                  <span>Port</span>
                  <strong>{status.port}</strong>
                </li>
              </ul>
            ) : null}

            <Outlet context={outletCtx} />
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

function AnnounceIcon() {
  return (
    <SidebarIcon>
      <path
        d="M4 10v4h3l5 4V6L7 10H4zm12.5 2a2.5 2.5 0 00-1.5-2.3v4.6a2.5 2.5 0 001.5-2.3zM16 7.1A5 5 0 0119 12a5 5 0 01-3 4.9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </SidebarIcon>
  );
}

function RosterIcon() {
  return (
    <SidebarIcon>
      <path
        d="M16 19v-1a4 4 0 00-4-4H8a4 4 0 00-4 4v1M12 11a4 4 0 100-8 4 4 0 000 8zM20 19v-1a3.5 3.5 0 00-2.5-3.3M16.5 7.1a3 3 0 010 5.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </SidebarIcon>
  );
}

function LogsIcon() {
  return (
    <SidebarIcon>
      <path
        d="M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2zm2 5h6M9 13h6M9 17h4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </SidebarIcon>
  );
}
