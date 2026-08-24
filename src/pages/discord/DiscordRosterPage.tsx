import { useCallback, useEffect, useState } from 'react';
import {
  fetchJson,
  useDiscordOutlet,
  type RosterResponse,
  type RosterStatus,
} from './shared';

const ROSTER_FILTERS: { id: RosterStatus; label: string }[] = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'checked', label: 'ลงทะเบียนแล้ว' },
  { id: 'unchecked', label: 'ยังไม่ผูก' },
];

export function DiscordRosterPage() {
  const { refreshTick } = useDiscordOutlet();
  const [rosterFilter, setRosterFilter] = useState<RosterStatus>('unchecked');
  const [roster, setRoster] = useState<RosterResponse | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setRoster(
        await fetchJson<RosterResponse>(`/discord-api/members?status=${rosterFilter}`),
      );
    } catch (err) {
      setRoster(null);
      setError(err instanceof Error ? err.message : 'โหลดรายชื่อไม่สำเร็จ');
    }
  }, [rosterFilter]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 15_000);
    return () => window.clearInterval(id);
  }, [load, refreshTick]);

  return (
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
      {error ? <p className="form-error">{error}</p> : null}
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
  );
}
