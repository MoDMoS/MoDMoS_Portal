import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { hasPermission, portalLoginPath } from '../api';
import { useAuth } from '../auth';
import { PortalTopBar } from '../PortalTopBar';

type DiscordStatus = {
  ok: boolean;
  uptimeSec: number;
  discordReady: boolean;
  botTag: string | null;
  botId: string | null;
  guildCount: number;
  dbOk: boolean;
  port: number;
  startedAt: string;
};

type LogLine = { t: string; level: string; msg: string };

type RosterStatus = 'all' | 'checked' | 'unchecked';

type RosterMember = {
  id: number;
  name: string;
  checked: boolean;
  checkedByDiscordId: string | null;
  guildId: number | null;
  className: string | null;
  checkedAt: string | null;
};

type RosterResponse = {
  ok: boolean;
  serverId: string;
  status: RosterStatus;
  total: number;
  members: RosterMember[];
};

function formatUptime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}ชม. ${m}น. ${s}วิ`;
  if (m > 0) return `${m}น. ${s}วิ`;
  return `${s}วิ`;
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path, { credentials: 'include' });
  const data = (await response.json().catch(() => ({}))) as {
    message?: string;
  } & T;
  if (!response.ok) {
    throw new Error(data.message || `HTTP ${response.status}`);
  }
  return data;
}

const ROSTER_FILTERS: { id: RosterStatus; label: string }[] = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'checked', label: 'ลงทะเบียนแล้ว' },
  { id: 'unchecked', label: 'ยังไม่ผูก' },
];

export function DiscordPage() {
  const { user, loading } = useAuth();
  const canView = hasPermission(user, 'service:discord') || hasPermission(user, 'admin:access');
  const canLogs = hasPermission(user, 'admin:access');

  const [status, setStatus] = useState<DiscordStatus | null>(null);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [error, setError] = useState('');
  const [logError, setLogError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const [rosterFilter, setRosterFilter] = useState<RosterStatus>('unchecked');
  const [roster, setRoster] = useState<RosterResponse | null>(null);
  const [rosterError, setRosterError] = useState('');

  const load = useCallback(async () => {
    setRefreshing(true);
    setError('');
    try {
      const next = await fetchJson<DiscordStatus>('/discord-api/status');
      setStatus(next);
    } catch (err) {
      setStatus(null);
      setError(err instanceof Error ? err.message : 'โหลดสถานะไม่สำเร็จ');
    }

    setRosterError('');
    try {
      const next = await fetchJson<RosterResponse>(
        `/discord-api/members?status=${rosterFilter}`,
      );
      setRoster(next);
    } catch (err) {
      setRoster(null);
      setRosterError(err instanceof Error ? err.message : 'โหลดรายชื่อไม่สำเร็จ');
    }

    if (canLogs) {
      setLogError('');
      try {
        const next = await fetchJson<{ lines: LogLine[] }>('/discord-api/logs?lines=120');
        setLogs(next.lines ?? []);
      } catch (err) {
        setLogError(err instanceof Error ? err.message : 'โหลดล็อกไม่สำเร็จ');
      }
    }

    setRefreshing(false);
  }, [canLogs, rosterFilter]);

  useEffect(() => {
    if (!loading && user && canView) {
      void load();
      const id = window.setInterval(() => void load(), 15_000);
      return () => window.clearInterval(id);
    }
  }, [loading, user, canView, load]);

  if (!loading && !user) {
    return <Navigate to={portalLoginPath('/discord')} replace />;
  }

  if (!loading && user && !canView) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="shell">
      <div className="atmosphere" aria-hidden="true" />
      <div className="grid-fade" aria-hidden="true" />
      <PortalTopBar title="MoDMoS" subtitle="Discord Bot" />

      <main className="admin-main">
        <div className="admin-head">
          <h1>Discord Bot</h1>
          <p>สถานะ runtime บน VPS (พอร์ต 3000) — รีเฟรชอัตโนมัติทุก 15 วินาที</p>
          <div className="admin-nav">
            <Link to="/">← กลับ Portal</Link>
            <button type="button" className="discord-refresh" onClick={() => void load()} disabled={refreshing}>
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

        <section className="discord-roster">
          <div className="discord-roster__head">
            <h2>สมาชิก (Roster)</h2>
            <p className="discord-logs__hint">
              จาก Neon ตาม <code>GUILD_ID</code> ของ bot — อ่านอย่างเดียว
            </p>
          </div>
          <div className="discord-roster__filters" role="tablist" aria-label="กรองสมาชิก">
            {ROSTER_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={rosterFilter === f.id}
                className={
                  rosterFilter === f.id
                    ? 'discord-roster__filter is-active'
                    : 'discord-roster__filter'
                }
                onClick={() => setRosterFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
          {rosterError ? <p className="form-error">{rosterError}</p> : null}
          {roster ? (
            <>
              <p className="discord-roster__meta">แสดง {roster.total} รายการ</p>
              <div className="discord-roster__table-wrap">
                <table className="discord-roster__table">
                  <thead>
                    <tr>
                      <th>IGN</th>
                      <th>Class</th>
                      <th>Discord</th>
                      <th>สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.members.length === 0 ? (
                      <tr>
                        <td colSpan={4}>ไม่มีข้อมูลในกลุ่มนี้</td>
                      </tr>
                    ) : (
                      roster.members.map((m) => (
                        <tr key={m.id}>
                          <td>{m.name}</td>
                          <td>{m.className ?? '—'}</td>
                          <td className="discord-roster__mono">
                            {m.checkedByDiscordId ?? '—'}
                          </td>
                          <td>
                            {m.checked && m.checkedByDiscordId ? 'ผูกแล้ว' : 'ยังไม่ผูก'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </section>

        {canLogs ? (
          <section className="discord-logs">
            <h2>ล็อกล่าสุด</h2>
            <p className="discord-logs__hint">เฉพาะ admin — ค่าลับถูก redact แล้ว</p>
            {logError ? <p className="form-error">{logError}</p> : null}
            <pre className="discord-logs__console" aria-live="polite">
              {logs.length === 0
                ? 'ยังไม่มีล็อกในหน่วยความจำ'
                : logs
                    .map((line) => `[${line.t}] ${line.level.toUpperCase()} ${line.msg}`)
                    .join('\n')}
            </pre>
          </section>
        ) : (
          <p className="discord-logs__hint">ดูล็อกได้เฉพาะผู้ที่มีสิทธิ์ admin:access</p>
        )}
      </main>
    </div>
  );
}
