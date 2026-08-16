import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  api,
  hasPermission,
  portalLoginPath,
  type AdminRole,
  type AdminUser,
} from '../api';
import { useAuth } from '../auth';
import { PortalTopBar } from '../PortalTopBar';

export function AdminUsersPage() {
  const { user, loading, refresh } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string[]>>({});

  const load = useCallback(async () => {
    setError('');
    try {
      const [nextUsers, nextRoles] = await Promise.all([
        api.get<AdminUser[]>('/admin/users'),
        api.get<AdminRole[]>('/admin/roles'),
      ]);
      setUsers(nextUsers);
      setRoles(nextRoles);
      const nextDraft: Record<string, string[]> = {};
      for (const u of nextUsers) {
        nextDraft[u.id] = u.roles.map((r) => r.id);
      }
      setDraft(nextDraft);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลดข้อมูลไม่สำเร็จ');
    }
  }, []);

  useEffect(() => {
    if (user && hasPermission(user, 'admin:access')) {
      void load();
    }
  }, [user, load]);

  if (!loading && !user) {
    return <Navigate to={portalLoginPath('/admin')} replace />;
  }

  if (!loading && user && !hasPermission(user, 'admin:access')) {
    return <Navigate to="/" replace />;
  }

  async function saveRoles(userId: string) {
    setSavingId(userId);
    setError('');
    try {
      await api.patch(`/admin/users/${userId}/roles`, {
        roleIds: draft[userId] ?? [],
      });
      await load();
      if (userId === user?.id) {
        await api.post('/auth/refresh');
        await refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'บันทึก role ไม่สำเร็จ');
    } finally {
      setSavingId(null);
    }
  }

  function toggleRole(userId: string, roleId: string) {
    setDraft((prev) => {
      const current = prev[userId] ?? [];
      const next = current.includes(roleId)
        ? current.filter((id) => id !== roleId)
        : [...current, roleId];
      return { ...prev, [userId]: next };
    });
  }

  return (
    <div className="shell">
      <div className="atmosphere" aria-hidden="true" />
      <div className="grid-fade" aria-hidden="true" />
      <PortalTopBar title="MoDMoS" subtitle="Admin" />

      <main className="admin-main">
        <div className="admin-head">
          <h1>ผู้ใช้และ Role</h1>
          <p>กำหนด role ให้ผู้ใช้ — สิทธิ์ใหม่มีผลหลัง login/refresh</p>
          <div className="admin-nav">
            <Link className="admin-nav__active" to="/admin">
              ผู้ใช้
            </Link>
            <Link to="/admin/roles">Roles</Link>
            <Link to="/">← Portal</Link>
          </div>
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ผู้ใช้</th>
                <th>Roles</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div className="admin-user-name">{row.name}</div>
                    <div className="admin-user-email">{row.email}</div>
                  </td>
                  <td>
                    <div className="admin-check-grid">
                      {roles.map((role) => (
                        <label key={role.id} className="admin-check">
                          <input
                            type="checkbox"
                            checked={(draft[row.id] ?? []).includes(role.id)}
                            onChange={() => toggleRole(row.id, role.id)}
                          />
                          <span>
                            {role.name}
                            <small> ({role.code})</small>
                          </span>
                        </label>
                      ))}
                    </div>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-primary btn-primary--sm"
                      disabled={savingId === row.id}
                      onClick={() => void saveRoles(row.id)}
                    >
                      {savingId === row.id ? 'กำลังบันทึก...' : 'บันทึก'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export function AdminRolesPage() {
  const { user, loading } = useAuth();
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [permissions, setPermissions] = useState<
    Array<{ id: string; code: string; name: string }>
  >([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPerms, setEditPerms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newPerms, setNewPerms] = useState<string[]>([]);

  const load = useCallback(async () => {
    setError('');
    try {
      const [nextRoles, nextPermissions] = await Promise.all([
        api.get<AdminRole[]>('/admin/roles'),
        api.get<Array<{ id: string; code: string; name: string }>>(
          '/admin/permissions',
        ),
      ]);
      setRoles(nextRoles);
      setPermissions(nextPermissions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลดข้อมูลไม่สำเร็จ');
    }
  }, []);

  useEffect(() => {
    if (user && hasPermission(user, 'admin:access')) {
      void load();
    }
  }, [user, load]);

  if (!loading && !user) {
    return <Navigate to={portalLoginPath('/admin/roles')} replace />;
  }

  if (!loading && user && !hasPermission(user, 'admin:access')) {
    return <Navigate to="/" replace />;
  }

  function startEdit(role: AdminRole) {
    setEditingId(role.id);
    setEditName(role.name);
    setEditPerms(role.permissions.map((p) => p.code));
    setMsg('');
    setError('');
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editingId) return;
    setSaving(true);
    setError('');
    setMsg('');
    try {
      await api.patch(`/admin/roles/${editingId}`, {
        name: editName,
        permissionCodes: editPerms,
      });
      setMsg('บันทึก role แล้ว');
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  async function createRole(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMsg('');
    try {
      await api.post('/admin/roles', {
        code: newCode,
        name: newName,
        permissionCodes: newPerms,
      });
      setNewCode('');
      setNewName('');
      setNewPerms([]);
      setMsg('สร้าง role แล้ว');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'สร้าง role ไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  async function removeRole(id: string) {
    if (!window.confirm('ลบ role นี้?')) return;
    setError('');
    setMsg('');
    try {
      await api.delete(`/admin/roles/${id}`);
      setMsg('ลบ role แล้ว');
      if (editingId === id) setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ลบ role ไม่สำเร็จ');
    }
  }

  return (
    <div className="shell">
      <div className="atmosphere" aria-hidden="true" />
      <div className="grid-fade" aria-hidden="true" />
      <PortalTopBar title="MoDMoS" subtitle="Admin" />

      <main className="admin-main">
        <div className="admin-head">
          <h1>จัดการ Roles</h1>
          <p>กำหนด permission ให้แต่ละ role</p>
          <div className="admin-nav">
            <Link to="/admin">ผู้ใช้</Link>
            <Link className="admin-nav__active" to="/admin/roles">
              Roles
            </Link>
            <Link to="/">← Portal</Link>
          </div>
        </div>

        {error ? <p className="form-error">{error}</p> : null}
        {msg ? <p className="form-success">{msg}</p> : null}

        <section className="admin-panel">
          <h2>Roles ที่มี</h2>
          <ul className="admin-role-list">
            {roles.map((role) => (
              <li key={role.id} className="admin-role-item">
                <div>
                  <strong>{role.name}</strong>
                  <span className="admin-muted"> ({role.code})</span>
                  {role.isSystem ? (
                    <span className="admin-badge">system</span>
                  ) : null}
                  <p className="admin-muted">
                    {role.permissions.map((p) => p.code).join(', ') || 'ไม่มี permission'}
                  </p>
                </div>
                <div className="admin-role-actions">
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => startEdit(role)}
                  >
                    แก้ไข
                  </button>
                  {!role.isSystem ? (
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => void removeRole(role.id)}
                    >
                      ลบ
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>

        {editingId ? (
          <form className="admin-panel auth-form" onSubmit={saveEdit}>
            <h2>แก้ไข Role</h2>
            <label className="field">
              <span>ชื่อ</span>
              <input
                className="input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </label>
            <div className="admin-check-grid">
              {permissions.map((p) => (
                <label key={p.code} className="admin-check">
                  <input
                    type="checkbox"
                    checked={editPerms.includes(p.code)}
                    onChange={() =>
                      setEditPerms((prev) =>
                        prev.includes(p.code)
                          ? prev.filter((c) => c !== p.code)
                          : [...prev, p.code],
                      )
                    }
                  />
                  <span>
                    {p.name}
                    <small> ({p.code})</small>
                  </span>
                </label>
              ))}
            </div>
            <div className="admin-role-actions">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setEditingId(null)}
              >
                ยกเลิก
              </button>
            </div>
          </form>
        ) : null}

        <form className="admin-panel auth-form" onSubmit={createRole}>
          <h2>สร้าง Role ใหม่</h2>
          <label className="field">
            <span>รหัส (code)</span>
            <input
              className="input"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="เช่น analyst"
              required
            />
          </label>
          <label className="field">
            <span>ชื่อ</span>
            <input
              className="input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
          </label>
          <div className="admin-check-grid">
            {permissions.map((p) => (
              <label key={p.code} className="admin-check">
                <input
                  type="checkbox"
                  checked={newPerms.includes(p.code)}
                  onChange={() =>
                    setNewPerms((prev) =>
                      prev.includes(p.code)
                        ? prev.filter((c) => c !== p.code)
                        : [...prev, p.code],
                    )
                  }
                />
                <span>
                  {p.name}
                  <small> ({p.code})</small>
                </span>
              </label>
            ))}
          </div>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'กำลังสร้าง...' : 'สร้าง Role'}
          </button>
        </form>
      </main>
    </div>
  );
}
