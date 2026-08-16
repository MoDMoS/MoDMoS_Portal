import { Link } from 'react-router-dom';
import { portalLoginPath } from '../api';
import { useAuth } from '../auth';
import { PortalTopBar } from '../PortalTopBar';
import { services, type Service } from '../services';

function ServiceCard({
  service,
  index,
  locked,
}: {
  service: Service;
  index: number;
  locked: boolean;
}) {
  const className = [
    'service-card',
    service.available && !locked ? 'service-card--live' : 'service-card--soon',
  ].join(' ');

  const body = (
    <>
      <span className="service-card__index">{String(index + 1).padStart(2, '0')}</span>
      <h2 className="service-card__name">{service.name}</h2>
      <p className="service-card__desc">{service.description}</p>
      <span className="service-card__cta">
        {!service.available
          ? 'เร็วๆ นี้'
          : locked
            ? 'เข้าสู่ระบบเพื่อใช้งาน'
            : 'เข้าใช้งาน'}
      </span>
    </>
  );

  if (service.available && service.href && !locked) {
    return (
      <a className={className} href={service.href} style={{ animationDelay: `${180 + index * 90}ms` }}>
        {body}
      </a>
    );
  }

  if (service.available && locked) {
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
  const locked = !loading && !user;

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
          {services.map((service, index) => (
            <li key={service.id}>
              <ServiceCard service={service} index={index} locked={locked} />
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
