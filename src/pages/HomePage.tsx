import { Link } from 'react-router-dom';
import { hasPermission, portalLoginPath } from '../api';
import { useAuth } from '../auth';
import { PortalTopBar } from '../PortalTopBar';
import { services, type Service } from '../services';

function ServiceCard({
  service,
  index,
  authLocked,
  permissionLocked,
}: {
  service: Service;
  index: number;
  authLocked: boolean;
  permissionLocked: boolean;
}) {
  const locked = authLocked || permissionLocked;
  const className = [
    'service-card',
    service.available && !locked ? 'service-card--live' : 'service-card--soon',
  ].join(' ');

  const cta = !service.available
    ? 'เร็วๆ นี้'
    : authLocked
      ? 'เข้าสู่ระบบเพื่อใช้งาน'
      : permissionLocked
        ? 'ไม่มีสิทธิ์เข้าถึง'
        : 'เข้าใช้งาน';

  const body = (
    <>
      <span className="service-card__index">{String(index + 1).padStart(2, '0')}</span>
      <h2 className="service-card__name">{service.name}</h2>
      <p className="service-card__desc">{service.description}</p>
      <span className="service-card__cta">{cta}</span>
    </>
  );

  if (service.available && service.href && !locked) {
    if (service.internal) {
      return (
        <Link className={className} to={service.href} style={{ animationDelay: `${180 + index * 90}ms` }}>
          {body}
        </Link>
      );
    }
    return (
      <a className={className} href={service.href} style={{ animationDelay: `${180 + index * 90}ms` }}>
        {body}
      </a>
    );
  }

  if (service.available && authLocked) {
    return (
      <Link
        className={className}
        to={portalLoginPath(service.href)}
        style={{ animationDelay: `${180 + index * 90}ms` }}
      >
        {body}
      </Link>
    );
  }

  return (
    <div className={className} style={{ animationDelay: `${180 + index * 90}ms` }}>
      {body}
    </div>
  );
}

export function HomePage() {
  const { user, loading } = useAuth();
  const authLocked = !loading && !user;
  const visibleServices = services.filter((service) => {
    if (!user) return service.id !== 'admin';
    return hasPermission(user, service.permission);
  });

  return (
    <div className="shell">
      <div className="atmosphere" aria-hidden="true" />
      <div className="grid-fade" aria-hidden="true" />
      <PortalTopBar />

      <main className="hero">
        <div className="brand-row">
          <img
            className="brand-mark"
            src={`${import.meta.env.BASE_URL}favicon.png`}
            alt=""
            width={72}
            height={72}
          />
          <div>
            <p className="brand">MoDMoS</p>
            <h1 className="headline">Portal</h1>
          </div>
        </div>
        <p className="lede">
          {user
            ? 'เลือกบริการส่วนตัวที่ต้องการใช้งาน'
            : 'เข้าสู่ระบบครั้งเดียว แล้วใช้ได้ทุกบริการ'}
        </p>

        <ul className="service-list">
          {visibleServices.map((service, index) => (
            <li key={service.id}>
              <ServiceCard
                service={service}
                index={index}
                authLocked={authLocked}
                permissionLocked={
                  !authLocked && !hasPermission(user, service.permission)
                }
              />
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
