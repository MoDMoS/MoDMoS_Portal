import { useOutletContext } from 'react-router-dom';

export type DiscordStatus = {
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

export type LogLine = { t: string; level: string; msg: string };

export type RosterStatus = 'all' | 'checked' | 'unchecked';

export type RosterMember = {
  id: number;
  name: string;
  checked: boolean;
  checkedByDiscordId: string | null;
  guildId: number | null;
  className: string | null;
  checkedAt: string | null;
};

export type RosterResponse = {
  ok: boolean;
  serverId: string;
  status: RosterStatus;
  total: number;
  members: RosterMember[];
};

export type ScheduleSlot = { weekday: number; time: string };

export type Announcement = {
  id: number;
  serverId: string;
  channelId: string;
  message: string;
  schedules: ScheduleSlot[];
  enabled: boolean;
  createdByDiscordId: string | null;
  createdByEmail: string | null;
};

export type ChannelOption = { id: string; name: string; type: number };

export type DiscordOutletContext = {
  refreshTick: number;
  refreshing: boolean;
  requestRefresh: () => void;
};

export const WEEKDAYS = [
  { value: 0, label: 'อาทิตย์' },
  { value: 1, label: 'จันทร์' },
  { value: 2, label: 'อังคาร' },
  { value: 3, label: 'พุธ' },
  { value: 4, label: 'พฤหัสบดี' },
  { value: 5, label: 'ศุกร์' },
  { value: 6, label: 'เสาร์' },
];

export function formatUptime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}ชม. ${m}น. ${s}วิ`;
  if (m > 0) return `${m}น. ${s}วิ`;
  return `${s}วิ`;
}

export function formatSchedules(schedules: ScheduleSlot[]) {
  return schedules
    .map((s) => `${WEEKDAYS.find((d) => d.value === s.weekday)?.label ?? s.weekday} ${s.time}`)
    .join(', ');
}

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { credentials: 'include', ...init });
  const data = (await response.json().catch(() => ({}))) as {
    message?: string;
  } & T;
  if (!response.ok) {
    throw new Error(data.message || `HTTP ${response.status}`);
  }
  return data;
}

export function useDiscordOutlet() {
  return useOutletContext<DiscordOutletContext>();
}
