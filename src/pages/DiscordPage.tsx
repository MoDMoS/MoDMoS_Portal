import { useCallback, useEffect, useState, type FormEvent } from 'react';
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

type ScheduleSlot = { weekday: number; time: string };

type Announcement = {
  id: number;
  serverId: string;
  channelId: string;
  message: string;
  schedules: ScheduleSlot[];
  enabled: boolean;
  createdByDiscordId: string | null;
  createdByEmail: string | null;
};

type ChannelOption = { id: string; name: string; type: number };

const WEEKDAYS = [
  { value: 0, label: 'อาทิตย์' },
  { value: 1, label: 'จันทร์' },
  { value: 2, label: 'อังคาร' },
  { value: 3, label: 'พุธ' },
  { value: 4, label: 'พฤหัสบดี' },
  { value: 5, label: 'ศุกร์' },
  { value: 6, label: 'เสาร์' },
];

function formatUptime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}ชม. ${m}น. ${s}วิ`;
  if (m > 0) return `${m}น. ${s}วิ`;
  return `${s}วิ`;
}

function formatSchedules(schedules: ScheduleSlot[]) {
  return schedules
    .map((s) => `${WEEKDAYS.find((d) => d.value === s.weekday)?.label ?? s.weekday} ${s.time}`)
    .join(', ');
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { credentials: 'include', ...init });
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

  const [channels, setChannels] = useState<ChannelOption[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announceError, setAnnounceError] = useState('');
  const [announceBusy, setAnnounceBusy] = useState(false);
  const [formChannelId, setFormChannelId] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formSlots, setFormSlots] = useState<ScheduleSlot[]>([
    { weekday: 2, time: '21:00' },
  ]);

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

    setAnnounceError('');
    try {
      const [ch, an] = await Promise.all([
        fetchJson<{ channels: ChannelOption[] }>('/discord-api/channels'),
        fetchJson<{ announcements: Announcement[] }>('/discord-api/announcements'),
      ]);
      setChannels(ch.channels ?? []);
      setAnnouncements(an.announcements ?? []);
      setFormChannelId((prev) => prev || ch.channels?.[0]?.id || '');
    } catch (err) {
      setAnnounceError(err instanceof Error ? err.message : 'โหลดประกาศไม่สำเร็จ');
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

  async function createAnnouncement(e: FormEvent) {
    e.preventDefault();
    setAnnounceBusy(true);
    setAnnounceError('');
    try {
      await fetchJson('/discord-api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: formChannelId,
          message: formMessage,
          schedules: formSlots,
          enabled: true,
        }),
      });
      setFormMessage('');
      setFormSlots([{ weekday: 2, time: '21:00' }]);
      await load();
    } catch (err) {
      setAnnounceError(err instanceof Error ? err.message : 'สร้างประกาศไม่สำเร็จ');
    } finally {
      setAnnounceBusy(false);
    }
  }

  async function toggleAnnouncement(row: Announcement) {
    setAnnounceBusy(true);
    setAnnounceError('');
    try {
      await fetchJson(`/discord-api/announcements/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !row.enabled }),
      });
      await load();
    } catch (err) {
      setAnnounceError(err instanceof Error ? err.message : 'อัปเดตไม่สำเร็จ');
    } finally {
      setAnnounceBusy(false);
    }
  }

  async function deleteAnnouncement(id: number) {
    if (!window.confirm(`ลบประกาศ #${id}?`)) return;
    setAnnounceBusy(true);
    setAnnounceError('');
    try {
      await fetchJson(`/discord-api/announcements/${id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setAnnounceError(err instanceof Error ? err.message : 'ลบไม่สำเร็จ');
    } finally {
      setAnnounceBusy(false);
    }
  }

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

        <section className="discord-announce">
          <h2>ประกาศตามเวลา</h2>
          <p className="discord-logs__hint">
            รายสัปดาห์ · timezone Asia/Bangkok · แชร์ข้อมูลกับปุ่มใน Discord
          </p>
          {announceError ? <p className="form-error">{announceError}</p> : null}

          <form className="discord-announce__form" onSubmit={(e) => void createAnnouncement(e)}>
            <label>
              ช่องปลายทาง
              <select
                value={formChannelId}
                onChange={(e) => setFormChannelId(e.target.value)}
                required
              >
                {channels.length === 0 ? <option value="">— ไม่มีช่อง —</option> : null}
                {channels.map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              ข้อความ
              <textarea
                value={formMessage}
                onChange={(e) => setFormMessage(e.target.value)}
                rows={4}
                required
                maxLength={2000}
              />
            </label>
            <div className="discord-announce__slots">
              <span>ตารางเวลา</span>
              {formSlots.map((slot, idx) => (
                <div key={idx} className="discord-announce__slot">
                  <select
                    value={slot.weekday}
                    onChange={(e) => {
                      const next = [...formSlots];
                      next[idx] = { ...slot, weekday: Number(e.target.value) };
                      setFormSlots(next);
                    }}
                  >
                    {WEEKDAYS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="time"
                    value={slot.time}
                    onChange={(e) => {
                      const next = [...formSlots];
                      next[idx] = { ...slot, time: e.target.value };
                      setFormSlots(next);
                    }}
                    required
                  />
                  <button
                    type="button"
                    className="discord-roster__filter"
                    disabled={formSlots.length <= 1}
                    onClick={() => setFormSlots(formSlots.filter((_, i) => i !== idx))}
                  >
                    ลบแถว
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="discord-roster__filter"
                onClick={() =>
                  setFormSlots([...formSlots, { weekday: 4, time: '21:00' }])
                }
              >
                + เพิ่มวัน/เวลา
              </button>
            </div>
            <button type="submit" className="discord-refresh" disabled={announceBusy || !formChannelId}>
              {announceBusy ? 'กำลังบันทึก…' : 'สร้างประกาศ'}
            </button>
          </form>

          <div className="discord-roster__table-wrap" style={{ marginTop: '1.25rem' }}>
            <table className="discord-roster__table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>ช่อง</th>
                  <th>เวลา</th>
                  <th>ข้อความ</th>
                  <th>สถานะ</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {announcements.length === 0 ? (
                  <tr>
                    <td colSpan={6}>ยังไม่มีประกาศ</td>
                  </tr>
                ) : (
                  announcements.map((a) => {
                    const chName = channels.find((c) => c.id === a.channelId)?.name;
                    return (
                      <tr key={a.id}>
                        <td>#{a.id}</td>
                        <td>{chName ? `#${chName}` : a.channelId}</td>
                        <td>{formatSchedules(a.schedules)}</td>
                        <td>{a.message.slice(0, 80)}{a.message.length > 80 ? '…' : ''}</td>
                        <td>{a.enabled ? 'เปิด' : 'ปิด'}</td>
                        <td className="discord-announce__actions">
                          <button
                            type="button"
                            className="discord-roster__filter"
                            disabled={announceBusy}
                            onClick={() => void toggleAnnouncement(a)}
                          >
                            {a.enabled ? 'ปิด' : 'เปิด'}
                          </button>
                          <button
                            type="button"
                            className="discord-roster__filter"
                            disabled={announceBusy}
                            onClick={() => void deleteAnnouncement(a.id)}
                          >
                            ลบ
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

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
