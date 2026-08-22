import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  api,
  hasPermission,
  portalLoginPath,
  type AdminDatabaseRows,
  type AdminDatabaseSummary,
  type AdminDatabaseTable,
} from '../api';
import { useAuth } from '../auth';
import { AdminNav } from './AdminPages';
import { PortalTopBar } from '../PortalTopBar';

function formatCell(value: unknown) {
  if (value == null) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function formatEstimate(value: number | null) {
  if (value == null || Number.isNaN(value)) return '—';
  return value.toLocaleString('th-TH');
}

function useAdminGate(nextPath: string) {
  const auth = useAuth();
  const { user, loading } = auth;
  const allowed = Boolean(user && hasPermission(user, 'admin:access'));
  let redirect = null;
  if (!loading && !user) {
    redirect = <Navigate to={portalLoginPath(nextPath)} replace />;
  } else if (!loading && user && !allowed) {
    redirect = <Navigate to="/" replace />;
  }
  return { ...auth, allowed, redirect };
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
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [loadingDatabases, setLoadingDatabases] = useState(true);
  const [loadingTables, setLoadingTables] = useState(false);
  const [loadingRows, setLoadingRows] = useState(false);

  const selectedDatabase = useMemo(
    () => databases.find((entry) => entry.id === selectedId) ?? null,
    [databases, selectedId],
  );

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
    async (
      databaseId: string,
      schema: string,
      table: string,
      nextPage = 1,
    ) => {
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

  return (
    <div className="shell">
      <div className="atmosphere" aria-hidden="true" />
      <div className="grid-fade" aria-hidden="true" />
      <PortalTopBar title="MoDMoS" subtitle="Admin" />

      <main className="admin-main">
        <div className="admin-head admin-head--row">
          <div>
            <h1>Databases</h1>
            <p>ดูข้อมูลแบบ read-only สำหรับ admin (Portal, Gold, Investment, Discord)</p>
            <AdminNav active="databases" />
          </div>
          <button type="button" className="btn-ghost" onClick={() => void loadDatabases()}>
            รีเฟรช
          </button>
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="db-viewer">
          <aside className="db-viewer__sidebar">
            <h2>ฐานข้อมูล</h2>
            {loadingDatabases ? (
              <p className="admin-muted">กำลังโหลด...</p>
            ) : (
              <div className="db-viewer__db-list">
                {databases.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className={
                      selectedId === entry.id
                        ? 'db-viewer__db db-viewer__db--active'
                        : 'db-viewer__db'
                    }
                    onClick={() => setSelectedId(entry.id)}
                  >
                    <span className="db-viewer__db-name">{entry.name}</span>
                    <span className="db-viewer__db-meta">
                      {!entry.configured
                        ? 'ยังไม่ตั้งค่า'
                        : entry.connected
                          ? `${entry.tableCount ?? 0} ตาราง`
                          : 'เชื่อมต่อไม่ได้'}
                    </span>
                    {entry.error ? (
                      <span className="db-viewer__db-error">{entry.error}</span>
                    ) : null}
                  </button>
                ))}
              </div>
            )}
          </aside>

          <section className="db-viewer__panel">
            {!selectedDatabase ? (
              <p className="admin-muted">เลือกฐานข้อมูล</p>
            ) : !selectedDatabase.configured ? (
              <p className="admin-muted">
                ยังไม่ได้ตั้ง env บน Portal API สำหรับฐานข้อมูลนี้
              </p>
            ) : !selectedDatabase.connected ? (
              <p className="admin-muted">เชื่อมต่อฐานข้อมูลไม่ได้ — ตรวจ env และ Postgres บน VPS</p>
            ) : loadingTables ? (
              <p className="admin-muted">กำลังโหลดตาราง...</p>
            ) : (
              <>
                <div className="db-viewer__tables">
                  <h2>ตาราง</h2>
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Schema</th>
                          <th>Table</th>
                          <th>แถว (ประมาณ)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tables.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="admin-empty">
                              ไม่มีตาราง
                            </td>
                          </tr>
                        ) : (
                          tables.map((table) => {
                            const active =
                              selectedTable?.schema === table.schema &&
                              selectedTable?.name === table.name;
                            return (
                              <tr
                                key={`${table.schema}.${table.name}`}
                                className={active ? 'db-viewer__table-row--active' : undefined}
                              >
                                <td>{table.schema}</td>
                                <td>
                                  <button
                                    type="button"
                                    className="db-viewer__table-link"
                                    onClick={() => {
                                      setSelectedTable({
                                        schema: table.schema,
                                        name: table.name,
                                      });
                                      setPage(1);
                                    }}
                                  >
                                    {table.name}
                                  </button>
                                </td>
                                <td className="admin-muted">
                                  {formatEstimate(table.rowEstimate)}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {selectedTable ? (
                  <div className="db-viewer__rows">
                    <div className="db-viewer__rows-head">
                      <h2>
                        {selectedTable.schema}.{selectedTable.name}
                      </h2>
                      {rows?.total != null ? (
                        <span className="admin-muted">
                          {rows.total.toLocaleString('th-TH')} แถว
                        </span>
                      ) : null}
                    </div>

                    {loadingRows ? (
                      <p className="admin-muted">กำลังโหลดข้อมูล...</p>
                    ) : rows ? (
                      <>
                        <div className="admin-table-wrap db-viewer__rows-table">
                          <table className="admin-table">
                            <thead>
                              <tr>
                                {rows.columns.map((column) => (
                                  <th key={column}>{column}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {rows.rows.length === 0 ? (
                                <tr>
                                  <td colSpan={rows.columns.length || 1} className="admin-empty">
                                    ไม่มีข้อมูล
                                  </td>
                                </tr>
                              ) : (
                                rows.rows.map((row, index) => (
                                  <tr key={index}>
                                    {rows.columns.map((column) => (
                                      <td key={column} className="db-viewer__cell">
                                        {formatCell(row[column])}
                                      </td>
                                    ))}
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>

                        {totalPages && totalPages > 1 ? (
                          <div className="db-viewer__pager">
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
                  </div>
                ) : (
                  <p className="admin-muted">เลือกตารางเพื่อดูข้อมูล</p>
                )}
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
