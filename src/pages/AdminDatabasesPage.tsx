import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  api,
  type AdminDatabaseRows,
  type AdminDatabaseSummary,
  type AdminDatabaseTable,
} from '../api';
import { AdminShell, useAdminGate } from './AdminShell';

function formatCell(value: unknown) {
  if (value == null) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function formatEstimate(value: number | null) {
  if (value == null || Number.isNaN(value)) return null;
  return value.toLocaleString('th-TH');
}

function connectionStatus(entry: AdminDatabaseSummary) {
  if (!entry.configured) return { label: 'ยังไม่ตั้งค่า', tone: 'muted' as const };
  if (entry.connected) return { label: 'เชื่อมต่อแล้ว', tone: 'ok' as const };
  return { label: 'เชื่อมต่อไม่ได้', tone: 'bad' as const };
}

export function AdminDatabasesPage() {
  const { allowed, redirect } = useAdminGate('/admin/databases');
  const [databases, setDatabases] = useState<AdminDatabaseSummary[]>([]);
  const [tables, setTables] = useState<AdminDatabaseTable[]>([]);
  const [rows, setRows] = useState<AdminDatabaseRows | null>(null);
  const [selectedId, setSelectedId] = useState<string>('');
  const [selectedTable, setSelectedTable] = useState<{ schema: string; name: string } | null>(
    null,
  );
  const [tableQuery, setTableQuery] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [loadingDatabases, setLoadingDatabases] = useState(true);
  const [loadingTables, setLoadingTables] = useState(false);
  const [loadingRows, setLoadingRows] = useState(false);

  const selectedDatabase = useMemo(
    () => databases.find((entry) => entry.id === selectedId) ?? null,
    [databases, selectedId],
  );

  const filteredTables = useMemo(() => {
    const query = tableQuery.trim().toLowerCase();
    if (!query) return tables;
    return tables.filter((table) => {
      const full = `${table.schema}.${table.name}`.toLowerCase();
      return full.includes(query) || table.name.toLowerCase().includes(query);
    });
  }, [tableQuery, tables]);

  const loadDatabases = useCallback(async () => {
    setLoadingDatabases(true);
    setError('');
    try {
      const next = await api.get<AdminDatabaseSummary[]>('/admin/databases');
      setDatabases(next);
      setSelectedId((current) => current || next.find((entry) => entry.connected)?.id || next[0]?.id || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลดรายการฐานข้อมูลไม่สำเร็จ');
    } finally {
      setLoadingDatabases(false);
    }
  }, []);

  const loadTables = useCallback(async (databaseId: string) => {
    if (!databaseId) return;
    setLoadingTables(true);
    setError('');
    setTables([]);
    setRows(null);
    setSelectedTable(null);
    setTableQuery('');
    setPage(1);
    try {
      setTables(await api.get<AdminDatabaseTable[]>(`/admin/databases/${databaseId}/tables`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลดตารางไม่สำเร็จ');
    } finally {
      setLoadingTables(false);
    }
  }, []);

  const loadRows = useCallback(
    async (databaseId: string, schema: string, table: string, nextPage = 1) => {
      if (!databaseId) return;
      setLoadingRows(true);
      setError('');
      try {
        const data = await api.get<AdminDatabaseRows>(
          `/admin/databases/${databaseId}/tables/${encodeURIComponent(schema)}/${encodeURIComponent(table)}?page=${nextPage}&limit=50`,
        );
        setRows(data);
        setPage(nextPage);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'โหลดข้อมูลตารางไม่สำเร็จ');
      } finally {
        setLoadingRows(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (allowed) void loadDatabases();
  }, [allowed, loadDatabases]);

  useEffect(() => {
    if (allowed && selectedId && selectedDatabase?.connected) {
      void loadTables(selectedId);
    }
  }, [allowed, loadTables, selectedDatabase?.connected, selectedId]);

  useEffect(() => {
    if (allowed && selectedId && selectedTable) {
      void loadRows(selectedId, selectedTable.schema, selectedTable.name, page);
    }
  }, [allowed, loadRows, page, selectedId, selectedTable]);

  if (redirect) return redirect;

  const totalPages =
    rows?.total != null ? Math.max(1, Math.ceil(rows.total / rows.limit)) : null;

  function selectDatabase(id: string) {
    setSelectedId(id);
    setSelectedTable(null);
    setRows(null);
    setPage(1);
  }

  function selectTable(schema: string, name: string) {
    setSelectedTable({ schema, name });
    setPage(1);
  }

  return (
    <AdminShell
      title="Databases"
      description="ดูข้อมูลแบบ read-only — เลือก DB และตารางจาก sidebar"
      actions={
        <button type="button" className="btn-ghost" onClick={() => void loadDatabases()}>
          รีเฟรช
        </button>
      }
    >
      {error ? <p className="form-error">{error}</p> : null}

      <div className="db-studio">
        <aside className="db-studio__sidebar" aria-label="Database explorer">
          <section className="db-studio__section">
            <h2>ฐานข้อมูล</h2>
            {loadingDatabases ? (
              <p className="admin-muted">กำลังโหลด...</p>
            ) : (
              <ul className="db-studio__db-list">
                {databases.map((entry) => {
                  const status = connectionStatus(entry);
                  return (
                    <li key={entry.id}>
                      <button
                        type="button"
                        className={
                          selectedId === entry.id
                            ? 'db-studio__db db-studio__db--active'
                            : 'db-studio__db'
                        }
                        onClick={() => selectDatabase(entry.id)}
                      >
                        <span className="db-studio__db-row">
                          <span
                            className={`db-studio__dot db-studio__dot--${status.tone}`}
                            aria-hidden="true"
                          />
                          <span className="db-studio__db-name">{entry.name}</span>
                        </span>
                        <span className="db-studio__db-meta">{status.label}</span>
                        {entry.connected && entry.tableCount != null ? (
                          <span className="db-studio__db-meta">
                            {entry.tableCount} ตาราง
                          </span>
                        ) : null}
                        {entry.error ? (
                          <span className="db-studio__db-error">{entry.error}</span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {selectedDatabase?.connected ? (
            <section className="db-studio__section db-studio__section--grow">
              <div className="db-studio__section-head">
                <h2>ตาราง</h2>
                <span className="admin-muted">{filteredTables.length}</span>
              </div>
              <label className="db-studio__search">
                <span className="sr-only">ค้นหาตาราง</span>
                <input
                  className="input"
                  value={tableQuery}
                  onChange={(event) => setTableQuery(event.target.value)}
                  placeholder="ค้นหาตาราง..."
                />
              </label>
              {loadingTables ? (
                <p className="admin-muted">กำลังโหลดตาราง...</p>
              ) : filteredTables.length === 0 ? (
                <p className="admin-muted">ไม่พบตาราง</p>
              ) : (
                <ul className="db-studio__table-list">
                  {filteredTables.map((table) => {
                    const active =
                      selectedTable?.schema === table.schema &&
                      selectedTable?.name === table.name;
                    const estimate = formatEstimate(table.rowEstimate);
                    return (
                      <li key={`${table.schema}.${table.name}`}>
                        <button
                          type="button"
                          className={
                            active
                              ? 'db-studio__table db-studio__table--active'
                              : 'db-studio__table'
                          }
                          onClick={() => selectTable(table.schema, table.name)}
                        >
                          <span className="db-studio__table-name">{table.name}</span>
                          <span className="db-studio__table-meta">
                            {table.schema}
                            {estimate ? ` · ~${estimate}` : ''}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ) : selectedDatabase && !selectedDatabase.connected ? (
            <section className="db-studio__section">
              <p className="admin-muted db-studio__hint">
                เชื่อมต่อ DB นี้ไม่ได้ — ตรวจ env และ Docker network `modmos-db`
              </p>
            </section>
          ) : null}
        </aside>

        <section className="db-studio__main">
          {!selectedDatabase ? (
            <div className="db-studio__empty">
              <p>เลือกฐานข้อมูลจาก sidebar</p>
            </div>
          ) : !selectedDatabase.configured ? (
            <div className="db-studio__empty">
              <p>ยังไม่ได้ตั้ง env บน Portal API สำหรับฐานข้อมูลนี้</p>
            </div>
          ) : !selectedTable ? (
            <div className="db-studio__empty">
              <p>เลือกตารางจาก sidebar เพื่อดูข้อมูล</p>
              {selectedDatabase.connected ? (
                <p className="admin-muted">{tables.length} ตารางใน {selectedDatabase.name}</p>
              ) : null}
            </div>
          ) : (
            <>
              <div className="db-studio__toolbar">
                <div className="db-studio__breadcrumb">
                  <span>{selectedDatabase.name}</span>
                  <span aria-hidden="true">/</span>
                  <strong>
                    {selectedTable.schema}.{selectedTable.name}
                  </strong>
                </div>
                <div className="db-studio__toolbar-meta">
                  {rows?.total != null ? (
                    <span className="admin-muted">
                      {rows.total.toLocaleString('th-TH')} แถว
                    </span>
                  ) : null}
                  {loadingRows ? <span className="admin-muted">กำลังโหลด...</span> : null}
                </div>
              </div>

              {rows ? (
                <>
                  <div className="db-studio__grid-wrap">
                    <table className="db-studio__grid">
                      <thead>
                        <tr>
                          <th className="db-studio__col-num">#</th>
                          {rows.columns.map((column) => (
                            <th key={column}>{column}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.rows.length === 0 ? (
                          <tr>
                            <td colSpan={rows.columns.length + 1} className="db-studio__empty-cell">
                              ไม่มีข้อมูล
                            </td>
                          </tr>
                        ) : (
                          rows.rows.map((row, index) => (
                            <tr key={index}>
                              <td className="db-studio__col-num">
                                {(page - 1) * rows.limit + index + 1}
                              </td>
                              {rows.columns.map((column) => {
                                const text = formatCell(row[column]);
                                return (
                                  <td
                                    key={column}
                                    className="db-studio__cell"
                                    title={text}
                                  >
                                    {text}
                                  </td>
                                );
                              })}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {totalPages && totalPages > 1 ? (
                    <div className="db-studio__pager">
                      <button
                        type="button"
                        className="btn-ghost"
                        disabled={page <= 1 || loadingRows}
                        onClick={() => setPage((current) => Math.max(1, current - 1))}
                      >
                        ← ก่อนหน้า
                      </button>
                      <span className="admin-muted">
                        หน้า {page} / {totalPages}
                      </span>
                      <button
                        type="button"
                        className="btn-ghost"
                        disabled={page >= totalPages || loadingRows}
                        onClick={() =>
                          setPage((current) => Math.min(totalPages, current + 1))
                        }
                      >
                        ถัดไป →
                      </button>
                    </div>
                  ) : null}
                </>
              ) : null}
            </>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
