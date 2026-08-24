import { FormEvent, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api, portalLoginPath, type User } from '../api';
import { useAuth } from '../auth';
import { PortalTopBar } from '../PortalTopBar';

export function ProfilePage() {
  const { user, loading, setUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);

  if (!loading && !user) {
    return <Navigate to={portalLoginPath('/profile')} replace />;
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setProfileMsg('');
    setProfileError('');
    setProfileSaving(true);
    try {
      const next = await api.patch<User>('/auth/profile', { name });
      setUser(next);
      setProfileMsg('บันทึกชื่อแล้ว');
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'บันทึกโปรไฟล์ไม่สำเร็จ');
    } finally {
      setProfileSaving(false);
    }
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault();
    setPasswordMsg('');
    setPasswordError('');
    setPasswordSaving(true);
    try {
      await api.patch('/auth/password', {
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMsg('เปลี่ยนรหัสผ่านแล้ว');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div className="shell">
      <div className="atmosphere" aria-hidden="true" />
      <div className="grid-fade" aria-hidden="true" />
      <PortalTopBar title="MoDMoS" subtitle="โปรไฟล์" />

      <main className="profile-main">
        <div className="profile-head">
          <h1>โปรไฟล์</h1>
          <p>แก้ไขชื่อที่แสดง และเปลี่ยนรหัสผ่าน</p>
          <Link className="profile-back" to="/">
            ← กลับ Portal
          </Link>
        </div>

        {loading || !user ? (
          <p className="topbar-muted">กำลังโหลด...</p>
        ) : (
          <div className="profile-grid">
            <form className="auth-card profile-card" onSubmit={saveProfile}>
              <h2>ข้อมูลบัญชี</h2>
              <label className="field">
                <span>ชื่อผู้ใช้</span>
                <input
                  className="input"
                  value={user.username ?? '—'}
                  disabled
                />
              </label>
              <label className="field">
                <span>อีเมล</span>
                <input
                  className="input"
                  value={user.email ?? '—'}
                  disabled
                />
              </label>
              <label className="field">
                <span>ชื่อที่แสดง</span>
                <input
                  className="input"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              {profileError ? <p className="form-error">{profileError}</p> : null}
              {profileMsg ? <p className="form-success">{profileMsg}</p> : null}
              <button className="btn-primary" type="submit" disabled={profileSaving}>
                {profileSaving ? 'กำลังบันทึก...' : 'บันทึกโปรไฟล์'}
              </button>
            </form>

            <form className="auth-card profile-card" onSubmit={savePassword}>
              <h2>เปลี่ยนรหัสผ่าน</h2>
              <label className="field">
                <span>รหัสผ่านปัจจุบัน</span>
                <input
                  className="input"
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </label>
              <label className="field">
                <span>รหัสผ่านใหม่</span>
                <input
                  className="input"
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </label>
              <label className="field">
                <span>ยืนยันรหัสผ่านใหม่</span>
                <input
                  className="input"
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </label>
              {passwordError ? <p className="form-error">{passwordError}</p> : null}
              {passwordMsg ? <p className="form-success">{passwordMsg}</p> : null}
              <button className="btn-primary" type="submit" disabled={passwordSaving}>
                {passwordSaving ? 'กำลังบันทึก...' : 'เปลี่ยนรหัสผ่าน'}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
