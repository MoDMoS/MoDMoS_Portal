import {
  FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useState,
} from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  api,
  hasPermission,
  portalLoginPath,
  type AdminPermission,
  type AdminRole,
  type AdminUser,
} from '../api';
import { useAuth } from '../auth';
import { ConfirmModal } from '../ConfirmModal';
import { PortalTopBar } from '../PortalTopBar';

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString('th-TH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return value;
  }
}

function IconEdit({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92l9.06-9.06.92.92L5.92 19.58zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
      />
    </svg>
  );
}

function IconTrash({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
      />
    </svg>
  );
}

export function AdminNav({
  active,
}: {
  active: 'users' | 'roles' | 'databases';
}) {
  return (
    <div className="admin-nav">
      <Link className={active === 'users' ? 'admin-nav__active' : undefined} to="/admin">
        ผู้ใช้
      </Link>
      <Link className={active === 'roles' ? 'admin-nav__active' : undefined} to="/admin/roles">
        Roles
      </Link>
      <Link
        className={active === 'databases' ? 'admin-nav__active' : undefined}
        to="/admin/databases"
      >
        Databases
      </Link>
      <Link to="/">← Portal</Link>
    </div>
  );
}

function RoleBadges({ roles }: { roles: Array<{ id: string; name: string; code: string }> }) {
  if (roles.length === 0) return <span className="admin-muted">—</span>;
  return (
    <div className="admin-chip-row">
      {roles.map((role) => (
        <span key={role.id} className="admin-chip" title={role.code}>
          {role.name}
        </span>
      ))}
    </div>
  );
}

function useAdminGate(nextPath: string) {
  const auth = useAuth();
  const { user, loading } = auth;
  const allowed = Boolean(user && hasPermission(user, 'admin:access'));
  let redirect: ReactNode = null;
  if (!loading && !user) {
    redirect = <Navigate to={portalLoginPath(nextPath)} replace />;
  } else if (!loading && user && !allowed) {
    redirect = <Navigate to="/" replace />;
  }
  return { ...auth, allowed, redirect };
}

export function AdminUsersPage() {
  const { user, allowed, redirect } = useAdminGate('/admin');
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingUser, setPendingUser] = useState<AdminUser | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      setUsers(await api.get<AdminUser[]>('/admin/users'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลดข้อมูลไม่สำเร็จ');
    }
  }, []);

  useEffect(() => {
    if (allowed) void load();
  }, [allowed, load]);

  if (redirect) return redirect;

  function requestRemove(row: AdminUser) {
    if (row.id === user?.id) {
      setError('ไม่สามารถลบบัญชีของตัวเองได้');
      return;
    }
    setError('');
    setPendingUser(row);
  }

  async function confirmRemove() {
    if (!pendingUser) return;
    setBusyId(pendingUser.id);
    setError('');
    try {
      await api.delete(`/admin/users/${pendingUser.id}`);
      setPendingUser(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ลบผู้ใช้ไม่สำเร็จ');
      setPendingUser(null);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="shell">
      <div className="atmosphere" aria-hidden="true" />
      <div className="grid-fade" aria-hidden="true" />
      <PortalTopBar title="MoDMoS" subtitle="Admin" />

      <main className="admin-main">
        <div className="admin-head">
          <h1>ผู้ใช้</h1>
          <p>ดูรายชื่อ แก้ไขข้อมูล หรือลบบัญชี</p>
          <AdminNav active="users" />
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ชื่อ</th>
                <th>อีเมล</th>
                <th>Roles</th>
                <th>สร้างเมื่อ</th>
                <th className="admin-col-actions">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="admin-empty">
                    ยังไม่มีผู้ใช้
                  </td>
                </tr>
              ) : (
                users.map((row) => (
                  <tr key={row.id}>
                    <td className="admin-user-name">{row.name}</td>
                    <td className="admin-user-email">{row.email}</td>
                    <td>
                      <RoleBadges roles={row.roles} />
                    </td>
                    <td className="admin-muted">{formatDate(row.createdAt)}</td>
                    <td className="admin-col-actions">
                      <div className="admin-icon-actions">
                        <button
                          type="button"
                          className="admin-icon-btn"
                          title="แก้ไข"
                          aria-label={`แก้ไข ${row.name}`}
                          onClick={() => navigate(`/admin/users/${row.id}`)}
                        >
                          <IconEdit />
                        </button>
                        <button
                          type="button"
                          className="admin-icon-btn admin-icon-btn--danger"
                          title="ลบ"
                          aria-label={`ลบ ${row.name}`}
                          disabled={busyId === row.id || row.id === user?.id}
                          onClick={() => requestRemove(row)}
                        >
                          <IconTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      <ConfirmModal
        open={Boolean(pendingUser)}
        title="ลบผู้ใช้"
        message={
          pendingUser
            ? `ลบผู้ใช้ ${pendingUser.name} (${pendingUser.email})? การกระทำนี้ย้อนกลับไม่ได้`
            : ''
        }
        confirmLabel="ลบ"
        danger
        busy={Boolean(pendingUser && busyId === pendingUser.id)}
        onCancel={() => setPendingUser(null)}
        onConfirm={() => void confirmRemove()}
      />
    </div>
  );
}

export function AdminUserEditPage() {
  const { id = '' } = useParams();
  const { user, refresh, allowed, redirect } = useAdminGate(`/admin/users/${id}`);
  const navigate = useNavigate();

  const [target, setTarget] = useState<AdminUser | null>(null);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [name, setName] = useState('');
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setError('');
    setLoadingUser(true);
    try {
      const [nextUser, nextRoles] = await Promise.all([
        api.get<AdminUser>(`/admin/users/${id}`),
        api.get<AdminRole[]>('/admin/roles'),
      ]);
      setTarget(nextUser);
      setRoles(nextRoles);
      setName(nextUser.name);
      setRoleIds(nextUser.roles.map((r) => r.id));
    } catch (err) {
      setTarget(null);
      setError(err instanceof Error ? err.message : 'โหลดผู้ใช้ไม่สำเร็จ');
    } finally {
      setLoadingUser(false);
    }
  }, [id]);

  useEffect(() => {
    if (allowed) void load();
  }, [allowed, load]);

  if (redirect) return redirect;

  function toggleRole(roleId: string) {
    setRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((x) => x !== roleId) : [...prev, roleId],
    );
  }

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!id) return;
    setSaving(true);
    setError('');
    setMsg('');
    try {
      const updated = await api.patch<AdminUser>(`/admin/users/${id}`, {
        name,
        roleIds,
      });
      setTarget(updated);
      setMsg('บันทึกแล้ว');
      if (id === user?.id) {
        await api.post('/auth/refresh');
        await refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="shell">
      <div className="atmosphere" aria-hidden="true" />
      <div className="grid-fade" aria-hidden="true" />
      <PortalTopBar title="MoDMoS" subtitle="Admin" />

      <main className="admin-main">
        <div className="admin-head">
          <h1>แก้ไขผู้ใช้</h1>
          <p>แก้ชื่อและ roles ได้ — อีเมลและรหัสผ่านแก้ไม่ได้จากหน้านี้</p>
          <AdminNav active="users" />
        </div>

        <p className="admin-back">
          <Link to="/admin">← กลับรายชื่อผู้ใช้</Link>
        </p>

        {error ? <p className="form-error">{error}</p> : null}
        {msg ? <p className="form-success">{msg}</p> : null}

        {loadingUser ? (
          <p className="admin-muted">กำลังโหลด...</p>
        ) : target ? (
          <form className="admin-panel auth-form" onSubmit={onSave}>
            <label className="field">
              <span>อีเมล</span>
              <input className="input" value={target.email} disabled readOnly />
            </label>
            <label className="field">
              <span>ชื่อ</span>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
            <fieldset className="admin-fieldset">
              <legend>Roles</legend>
              <div className="admin-check-grid">
                {roles.map((role) => (
                  <label key={role.id} className="admin-check">
                    <input
                      type="checkbox"
                      checked={roleIds.includes(role.id)}
                      onChange={() => toggleRole(role.id)}
                    />
                    <span>
                      {role.name}
                      <small> ({role.code})</small>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <p className="admin-muted">สร้างเมื่อ {formatDate(target.createdAt)}</p>
            <div className="admin-role-actions">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => navigate('/admin')}
              >
                ยกเลิก
              </button>
            </div>
          </form>
        ) : null}
      </main>
    </div>
  );
}

type RoleModalMode = 'create' | 'edit';

export function AdminRolesPage() {
  const { allowed, redirect } = useAdminGate('/admin/roles');
  const titleId = useId();

  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingRole, setPendingRole] = useState<AdminRole | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<RoleModalMode>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [permCodes, setPermCodes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const [nextRoles, nextPermissions] = await Promise.all([
        api.get<AdminRole[]>('/admin/roles'),
        api.get<AdminPermission[]>('/admin/permissions'),
      ]);
      setRoles(nextRoles);
      setPermissions(nextPermissions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลดข้อมูลไม่สำเร็จ');
    }
  }, []);

  useEffect(() => {
    if (allowed) void load();
  }, [allowed, load]);

  if (redirect) return redirect;

  function openCreate() {
    setModalMode('create');
    setEditingId(null);
    setCode('');
    setName('');
    setPermCodes([]);
    setError('');
    setMsg('');
    setModalOpen(true);
  }

  function openEdit(role: AdminRole) {
    setModalMode('edit');
    setEditingId(role.id);
    setCode(role.code);
    setName(role.name);
    setPermCodes(role.permissions.map((p) => p.code));
    setError('');
    setMsg('');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
  }

  function togglePerm(codeValue: string) {
    setPermCodes((prev) =>
      prev.includes(codeValue)
        ? prev.filter((c) => c !== codeValue)
        : [...prev, codeValue],
    );
  }

  async function onSubmitModal(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMsg('');
    try {
      if (modalMode === 'create') {
        await api.post('/admin/roles', {
          code,
          name,
          permissionCodes: permCodes,
        });
        setMsg('สร้าง role แล้ว');
      } else if (editingId) {
        await api.patch(`/admin/roles/${editingId}`, {
          name,
          permissionCodes: permCodes,
        });
        setMsg('บันทึก role แล้ว');
      }
      closeModal();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  function requestRemoveRole(role: AdminRole) {
    if (role.isSystem) return;
    setError('');
    setMsg('');
    setPendingRole(role);
  }

  async function confirmRemoveRole() {
    if (!pendingRole) return;
    setBusyId(pendingRole.id);
    setError('');
    setMsg('');
    try {
      await api.delete(`/admin/roles/${pendingRole.id}`);
      setMsg('ลบ role แล้ว');
      setPendingRole(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ลบ role ไม่สำเร็จ');
      setPendingRole(null);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="shell">
      <div className="atmosphere" aria-hidden="true" />
      <div className="grid-fade" aria-hidden="true" />
      <PortalTopBar title="MoDMoS" subtitle="Admin" />

      <main className="admin-main">
        <div className="admin-head admin-head--row">
          <div>
            <h1>Roles</h1>
            <p>กำหนด permission ให้แต่ละ role</p>
            <AdminNav active="roles" />
          </div>
          <button type="button" className="btn-primary" onClick={openCreate}>
            เพิ่ม Role
          </button>
        </div>

        {error && !modalOpen ? <p className="form-error">{error}</p> : null}
        {msg ? <p className="form-success">{msg}</p> : null}

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ชื่อ</th>
                <th>รหัส</th>
                <th>Permissions</th>
                <th>ประเภท</th>
                <th className="admin-col-actions">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {roles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="admin-empty">
                    ยังไม่มี role
                  </td>
                </tr>
              ) : (
                roles.map((role) => (
                  <tr key={role.id}>
                    <td className="admin-user-name">{role.name}</td>
                    <td>
                      <code className="admin-code">{role.code}</code>
                    </td>
                    <td>
                      <div className="admin-chip-row">
                        {role.permissions.length === 0 ? (
                          <span className="admin-muted">—</span>
                        ) : (
                          role.permissions.map((p) => (
                            <span key={p.id} className="admin-chip admin-chip--soft" title={p.name}>
                              {p.code}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td>
                      {role.isSystem ? (
                        <span className="admin-badge">system</span>
                      ) : (
                        <span className="admin-muted">custom</span>
                      )}
                    </td>
                    <td className="admin-col-actions">
                      <div className="admin-icon-actions">
                        <button
                          type="button"
                          className="admin-icon-btn"
                          title="แก้ไข"
                          aria-label={`แก้ไข ${role.name}`}
                          onClick={() => openEdit(role)}
                        >
                          <IconEdit />
                        </button>
                        <button
                          type="button"
                          className="admin-icon-btn admin-icon-btn--danger"
                          title="ลบ"
                          aria-label={`ลบ ${role.name}`}
                          disabled={role.isSystem || busyId === role.id}
                          onClick={() => requestRemoveRole(role)}
                        >
                          <IconTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {modalOpen ? (
        <div
          className="admin-modal-backdrop"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            className="admin-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <div className="admin-modal__head">
              <h2 id={titleId}>{modalMode === 'create' ? 'เพิ่ม Role' : 'แก้ไข Role'}</h2>
              <button
                type="button"
                className="admin-icon-btn"
                aria-label="ปิด"
                onClick={closeModal}
              >
                ×
              </button>
            </div>
            {error ? <p className="form-error">{error}</p> : null}
            <form className="auth-form" onSubmit={onSubmitModal}>
              <label className="field">
                <span>รหัส (code)</span>
                <input
                  className="input"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="เช่น analyst"
                  required
                  disabled={modalMode === 'edit'}
                />
              </label>
              <label className="field">
                <span>ชื่อ</span>
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </label>
              <fieldset className="admin-fieldset">
                <legend>Permissions</legend>
                <div className="admin-check-grid">
                  {permissions.map((p) => (
                    <label key={p.code} className="admin-check">
                      <input
                        type="checkbox"
                        checked={permCodes.includes(p.code)}
                        onChange={() => togglePerm(p.code)}
                      />
                      <span>
                        {p.name}
                        <small> ({p.code})</small>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="admin-role-actions">
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving
                    ? 'กำลังบันทึก...'
                    : modalMode === 'create'
                      ? 'สร้าง Role'
                      : 'บันทึก'}
                </button>
                <button type="button" className="btn-ghost" onClick={closeModal}>
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <ConfirmModal
        open={Boolean(pendingRole)}
        title="ลบ Role"
        message={
          pendingRole
            ? `ลบ role ${pendingRole.name} (${pendingRole.code})? ผู้ใช้ที่ถือ role นี้จะเสียสิทธิ์นั้น`
            : ''
        }
        confirmLabel="ลบ"
        danger
        busy={Boolean(pendingRole && busyId === pendingRole.id)}
        onCancel={() => setPendingRole(null)}
        onConfirm={() => void confirmRemoveRole()}
      />
    </div>
  );
}
