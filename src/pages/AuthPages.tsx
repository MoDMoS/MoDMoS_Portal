import { FormEvent, useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api, resolveNext, type User } from '../api';
import { useAuth } from '../auth';

function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="shell auth-shell">
      <div className="atmosphere" aria-hidden="true" />
      <div className="grid-fade" aria-hidden="true" />
      <main className="auth-card">
        <div className="auth-brand">
          <img
            src={`${import.meta.env.BASE_URL}favicon.png`}
            alt=""
            width={48}
            height={48}
          />
          <div>
            <p className="brand-sm">MoDMoS</p>
            <p className="auth-kicker">Portal</p>
          </div>
        </div>
        <h1>{title}</h1>
        <p className="auth-sub">{subtitle}</p>
        {children}
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function LoginPage() {
  const { user, loading, setUser } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    try {
      const message = sessionStorage.getItem('auth_notice');
      if (message) {
        sessionStorage.removeItem('auth_notice');
        setNotice(message);
      }
    } catch {
      /* ignore */
    }
  }, []);

  if (!loading && user) {
    return <Navigate to={resolveNext('/')} replace />;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const next = await api.post<User>('/auth/login', { email, password });
      setUser(next);
      navigate(resolveNext('/'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title="เข้าสู่ระบบ" subtitle="ใช้บัญชีเดียวสำหรับทุกบริการ MoDMoS">
      <form className="auth-form" onSubmit={onSubmit}>
        <Field label="อีเมล">
          <input
            className="input"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="รหัสผ่าน">
          <input
            className="input"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {notice ? <p className="form-notice">{notice}</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
        <button className="btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
        </button>
        <p className="auth-footer">
          ยังไม่มีบัญชี? <Link to="/register">สมัครสมาชิก</Link>
        </p>
      </form>
    </AuthShell>
  );
}

export function RegisterPage() {
  const { user, loading, setUser } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return <Navigate to={resolveNext('/')} replace />;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }
    setSubmitting(true);
    try {
      const next = await api.post<User>('/auth/register', {
        name,
        email,
        password,
        confirmPassword,
      });
      setUser(next);
      navigate(resolveNext('/'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'สมัครสมาชิกไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title="สมัครสมาชิก" subtitle="สร้างบัญชี MoDMoS สำหรับทุกบริการ">
      <form className="auth-form" onSubmit={onSubmit}>
        <Field label="ชื่อ">
          <input
            className="input"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="อีเมล">
          <input
            className="input"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="รหัสผ่าน (อย่างน้อย 8 ตัว)">
          <input
            className="input"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Field label="ยืนยันรหัสผ่าน">
          <input
            className="input"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </Field>
        {error ? <p className="form-error">{error}</p> : null}
        <button className="btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'กำลังสมัคร...' : 'สมัครสมาชิก'}
        </button>
        <p className="auth-footer">
          มีบัญชีแล้ว? <Link to="/login">เข้าสู่ระบบ</Link>
        </p>
      </form>
    </AuthShell>
  );
}
