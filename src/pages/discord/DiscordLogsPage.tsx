import { useCallback, useEffect, useState } from 'react';
import { fetchJson, useDiscordOutlet, type LogLine } from './shared';

export function DiscordLogsPage() {
  const { refreshTick } = useDiscordOutlet();
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const next = await fetchJson<{ lines: LogLine[] }>('/discord-api/logs?lines=120');
      setLogs(next.lines ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลดล็อกไม่สำเร็จ');
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 15_000);
    return () => window.clearInterval(id);
  }, [load, refreshTick]);

  return (
    <section className="discord-logs">
      <h2>ล็อกล่าสุด</h2>
      <p className="discord-logs__hint">
        ผู้ที่มีสิทธิ์ <code>service:discord</code> — ค่าลับถูก redact แล้ว
      </p>
      {error ? <p className="form-error">{error}</p> : null}
      <pre className="discord-logs__console" aria-live="polite">
        {logs.length === 0
          ? 'ยังไม่มีล็อกในหน่วยความจำ'
          : logs
              .map((line) => `[${line.t}] ${line.level.toUpperCase()} ${line.msg}`)
              .join('\n')}
      </pre>
    </section>
  );
}
