import { Link } from 'react-router-dom';
import { useAuth } from './auth';

export function PortalTopBar({
  title = 'MoDMoS',
  subtitle = 'Portal',
}: {
  title?: string;
  subtitle?: string;
}) {
  const { user, loading, logout } = useAuth();

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <a className="topbar-brand" href="/">
          <img
            src={`${import.meta.env.BASE_URL}favicon.png`}
            alt=""
            width={44}
            height={44}
          />
          <div>
            <p className="topbar-title">{title}</p>
            <p className="topbar-sub">{subtitle}</p>
          </div>
        </a>

        {loading ? (
          <span className="topbar-muted">กำลังโหลด...</span>
        ) : user ? (
          <div className="topbar-user">
            <Link className="topbar-name topbar-name-link" to="/profile">
              {user.name}
            </Link>
            <Link className="btn-ghost" to="/profile">
              โปรไฟล์
            </Link>
            <button type="button" className="btn-ghost" onClick={() => void logout()}>
              ออกจากระบบ
            </button>
          </div>
        ) : (
          <div className="topbar-user">
            <Link className="btn-ghost" to="/login">
              เข้าสู่ระบบ
            </Link>
            <Link className="btn-primary btn-primary--sm" to="/register">
              สมัครสมาชิก
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
