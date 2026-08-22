import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLauncher } from './AppLauncher';
import { useAuth } from './auth';

export function PortalTopBar({
  title = 'MoDMoS',
  subtitle = 'Portal',
}: {
  title?: string;
  subtitle?: string;
}) {
  const { user, loading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const initial = (user?.name?.trim()?.charAt(0) || '?').toUpperCase();

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
            <div className="topbar-menu" ref={menuRef}>
              <button
                type="button"
                className="topbar-profile-btn"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                title="โปรไฟล์"
                onClick={() => setMenuOpen((prev) => !prev)}
              >
                <span className="topbar-avatar">{initial}</span>
                <span className="topbar-profile-name">{user.name}</span>
              </button>

              {menuOpen ? (
                <div className="topbar-dropdown" role="menu">
                  <div className="topbar-dropdown__head">
                    <p className="topbar-dropdown__name">{user.name}</p>
                    <p className="topbar-dropdown__email">{user.email}</p>
                  </div>
                  <Link
                    role="menuitem"
                    className="topbar-dropdown__item"
                    to="/profile"
                    onClick={() => setMenuOpen(false)}
                  >
                    จัดการโปรไฟล์
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    className="topbar-dropdown__item topbar-dropdown__item--danger"
                    onClick={() => {
                      setMenuOpen(false);
                      void logout();
                    }}
                  >
                    ออกจากระบบ
                  </button>
                </div>
              ) : null}
            </div>

            <AppLauncher />
          </div>
        ) : (
          <div className="topbar-user">
            <Link className="btn-ghost" to="/login">
              เข้าสู่ระบบ
            </Link>
            <Link className="btn-primary btn-primary--sm" to="/register">
              สมัครสมาชิก
            </Link>
            <AppLauncher />
          </div>
        )}
      </div>
    </header>
  );
}
