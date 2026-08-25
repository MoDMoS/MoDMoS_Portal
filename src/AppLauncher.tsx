import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { hasPermission, portalLoginPath } from './api';
import { useAuth } from './auth';
import { services } from './services';

export function AppsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="5" r="1.6" />
      <circle cx="12" cy="5" r="1.6" />
      <circle cx="19" cy="5" r="1.6" />
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
      <circle cx="5" cy="19" r="1.6" />
      <circle cx="12" cy="19" r="1.6" />
      <circle cx="19" cy="19" r="1.6" />
    </svg>
  );
}

export function AppLauncher() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const authLocked = !loading && !user;
  const visibleServices = services.filter((service) => {
    if (!user) return service.id !== 'admin';
    return hasPermission(user, service.permission);
  });

  return (
    <div className="app-launcher" ref={rootRef}>
      <button
        type="button"
        className="topbar-icon-btn"
        aria-label="เปิดเมนูบริการ"
        aria-expanded={open}
        title="บริการ MoDMoS"
        onClick={() => setOpen((prev) => !prev)}
      >
        <AppsIcon className="topbar-apps-icon" />
      </button>

      {open ? (
        <div className="app-launcher__panel" role="menu">
          <p className="app-launcher__title">บริการ MoDMoS</p>
          <ul className="app-launcher__grid">
            {visibleServices.map((service) => {
              const permissionLocked =
                !authLocked && !hasPermission(user, service.permission);
              const locked = !service.available || authLocked || permissionLocked;

              let content = (
                <>
                  <span className="app-launcher__name">{service.name}</span>
                  <span className="app-launcher__desc">{service.description}</span>
                </>
              );

              if (service.available && service.href && !locked) {
                return (
                  <li key={service.id}>
                    {service.internal ? (
                      <Link
                        className="app-launcher__item app-launcher__item--live"
                        to={service.href}
                        onClick={() => setOpen(false)}
                      >
                        {content}
                      </Link>
                    ) : (
                      <a
                        className="app-launcher__item app-launcher__item--live"
                        href={service.href}
                        onClick={() => setOpen(false)}
                      >
                        {content}
                      </a>
                    )}
                  </li>
                );
              }

              if (service.available && authLocked && service.href) {
                return (
                  <li key={service.id}>
                    <Link
                      className="app-launcher__item"
                      to={portalLoginPath(service.href)}
                      onClick={() => setOpen(false)}
                    >
                      {content}
                    </Link>
                  </li>
                );
              }

              return (
                <li key={service.id}>
                  <div className="app-launcher__item app-launcher__item--disabled" aria-disabled="true">
                    {content}
                  </div>
                </li>
              );
            })}
          </ul>
          <Link className="app-launcher__home" to="/" onClick={() => setOpen(false)}>
            หน้า Portal หลัก
          </Link>
        </div>
      ) : null}
    </div>
  );
}
