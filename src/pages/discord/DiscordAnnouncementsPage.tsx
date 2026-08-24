import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  fetchJson,
  formatSchedules,
  useDiscordOutlet,
  WEEKDAYS,
  type Announcement,
  type ChannelOption,
  type ScheduleSlot,
} from './shared';

export function DiscordAnnouncementsPage() {
  const { refreshTick } = useDiscordOutlet();
  const [channels, setChannels] = useState<ChannelOption[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [formChannelId, setFormChannelId] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formSlots, setFormSlots] = useState<ScheduleSlot[]>([
    { weekday: 2, time: '21:00' },
  ]);

  const load = useCallback(async () => {
    setError('');
    try {
      const [ch, an] = await Promise.all([
        fetchJson<{ channels: ChannelOption[] }>('/discord-api/channels'),
        fetchJson<{ announcements: Announcement[] }>('/discord-api/announcements'),
      ]);
      setChannels(ch.channels ?? []);
      setAnnouncements(an.announcements ?? []);
      setFormChannelId((prev) => prev || ch.channels?.[0]?.id || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลดประกาศไม่สำเร็จ');
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 15_000);
    return () => window.clearInterval(id);
  }, [load, refreshTick]);

  async function createAnnouncement(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
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
      setError(err instanceof Error ? err.message : 'สร้างประกาศไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  async function toggleAnnouncement(row: Announcement) {
    setBusy(true);
    setError('');
    try {
      await fetchJson(`/discord-api/announcements/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !row.enabled }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'อัปเดตไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  async function deleteAnnouncement(id: number) {
    if (!window.confirm(`ลบประกาศ #${id}?`)) return;
    setBusy(true);
    setError('');
    try {
      await fetchJson(`/discord-api/announcements/${id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ลบไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="discord-announce">
      <h2>ประกาศตามเวลา</h2>
      <p className="discord-logs__hint">
        รายสัปดาห์ · timezone Asia/Bangkok · แชร์ข้อมูลกับปุ่มใน Discord
      </p>
      {error ? <p className="form-error">{error}</p> : null}

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
            onClick={() => setFormSlots([...formSlots, { weekday: 4, time: '21:00' }])}
          >
            + เพิ่มวัน/เวลา
          </button>
        </div>
        <button type="submit" className="discord-refresh" disabled={busy || !formChannelId}>
          {busy ? 'กำลังบันทึก…' : 'สร้างประกาศ'}
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
                    <td>
                      {a.message.slice(0, 80)}
                      {a.message.length > 80 ? '…' : ''}
                    </td>
                    <td>{a.enabled ? 'เปิด' : 'ปิด'}</td>
                    <td className="discord-announce__actions">
                      <button
                        type="button"
                        className="discord-roster__filter"
                        disabled={busy}
                        onClick={() => void toggleAnnouncement(a)}
                      >
                        {a.enabled ? 'ปิด' : 'เปิด'}
                      </button>
                      <button
                        type="button"
                        className="discord-roster__filter"
                        disabled={busy}
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
  );
}
