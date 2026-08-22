import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { PortalTopBar } from '../PortalTopBar';

type AdminSection = 'users' | 'roles' | 'databases';

const NAV: Array<{ id: AdminSection; label: string; to: string }> = [
  { id: 'users', label: 'ผู้ใช้', to: '/admin' },
  { id: 'roles', label: 'Roles', to: '/admin/roles' },
  { id: 'databases', label: 'Databases', to: '/admin/databases' },
];

export function AdminShell({
  active,
  title,
  description,
  actions,
  children,
}: {
  active: AdminSection;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="shell shell--admin">
      <div className="atmosphere" aria-hidden="true" />
      <div className="grid-fade" aria-hidden="true" />
      <PortalTopBar title="MoDMoS" subtitle="Admin" />

      <main className="admin-main admin-main--shell">
        <div className="admin-shell">
          <aside className="admin-shell__sidebar" aria-label="Admin navigation">
            <p className="admin-shell__label">Admin</p>
            <nav className="admin-shell__nav">
              {NAV.map((item) => (
                <Link
                  key={item.id}
                  className={
                    active === item.id
                      ? 'admin-shell__link admin-shell__link--active'
                      : 'admin-shell__link'
                  }
                  to={item.to}
                >
                  {item.label}
                </Link>
              ))}
              <Link className="admin-shell__link admin-shell__link--muted" to="/">
                ← Portal
              </Link>
            </nav>
          </aside>

          <div className="admin-shell__content">
            <div className="admin-shell__head">
              <div>
                <h1>{title}</h1>
                {description ? <p>{description}</p> : null}
              </div>
              {actions ? <div className="admin-shell__actions">{actions}</div> : null}
            </div>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
