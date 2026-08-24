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

const DEFAULT_WEEKDAY_FALLBACK = 2; // อังคาร

function getBangkokNowHHmm() {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts = dtf.formatToParts(new Date());
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
  return `${hour}:${minute}`;
}

function makeDefaultSlots(): ScheduleSlot[] {
  return [{ weekday: DEFAULT_WEEKDAY_FALLBACK, time: getBangkokNowHHmm() }];
}

export function DiscordAnnouncementsPage() {
  const { refreshTick } = useDiscordOutlet();
  const [channels, setChannels] = useState<ChannelOption[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formChannelId, setFormChannelId] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formSlots, setFormSlots] = useState<ScheduleSlot[]>(() => makeDefaultSlots());

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

  function resetForm(channelFallback?: string) {
    setEditingId(null);
    setFormMessage('');
    setFormSlots(makeDefaultSlots());
    setFormChannelId((prev) => channelFallback || prev || channels[0]?.id || '');
  }

  function startEdit(row: Announcement) {
    setEditingId(row.id);
    setFormChannelId(row.channelId);
    setFormMessage(row.message);
    setFormSlots(
      row.schedules.length
        ? row.schedules.map((s) => ({ weekday: s.weekday, time: s.time }))
        : makeDefaultSlots(),
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveAnnouncement(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const body = {
      channelId: formChannelId,
      message: formMessage,
      schedules: formSlots,
      enabled: true,
    };
    try {
      if (editingId != null) {
        const current = announcements.find((a) => a.id === editingId);
        await fetchJson(`/discord-api/announcements/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channelId: formChannelId,
            message: formMessage,
            schedules: formSlots,
            enabled: current?.enabled ?? true,
          }),
        });
        resetForm(formChannelId);
      } else {
        await fetchJson('/discord-api/announcements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        resetForm(formChannelId);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'บันทึกประกาศไม่สำเร็จ');
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
      if (editingId === id) resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ลบไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="discord-announce">
      <h2>{editingId != null ? `แก้ไขประกาศ #${editingId}` : 'ประกาศตามเวลา'}</h2>
      <p className="discord-logs__hint">
        รายสัปดาห์ · timezone Asia/Bangkok · แชร์ข้อมูลกับปุ่มใน Discord
      </p>
      {error ? <p className="form-error">{error}</p> : null}

      <form className="discord-announce__form" onSubmit={(e) => void saveAnnouncement(e)}>
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
              setFormSlots([...formSlots, { weekday: 4, time: getBangkokNowHHmm() }])
            }
          >
            + เพิ่มวัน/เวลา
          </button>
        </div>
        <div className="discord-announce__actions">
          <button type="submit" className="discord-refresh" disabled={busy || !formChannelId}>
            {busy ? 'กำลังบันทึก…' : editingId != null ? 'บันทึกการแก้ไข' : 'สร้างประกาศ'}
          </button>
          {editingId != null ? (
            <button
              type="button"
              className="discord-roster__filter"
              disabled={busy}
              onClick={() => resetForm()}
            >
              ยกเลิก
            </button>
          ) : null}
        </div>
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
                const isEditing = editingId === a.id;
                return (
                  <tr key={a.id} className={isEditing ? 'discord-announce__row--editing' : undefined}>
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
                        onClick={() => startEdit(a)}
                      >
                        {isEditing ? 'กำลังแก้' : 'แก้ไข'}
                      </button>
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
