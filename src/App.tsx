import { services, type Service } from './services';

function ServiceCard({ service, index }: { service: Service; index: number }) {
  const className = [
    'service-card',
    service.available ? 'service-card--live' : 'service-card--soon',
  ].join(' ');

  const body = (
    <>
      <span className="service-card__index">{String(index + 1).padStart(2, '0')}</span>
      <h2 className="service-card__name">{service.name}</h2>
      <p className="service-card__desc">{service.description}</p>
      <span className="service-card__cta">
        {service.available ? 'เข้าใช้งาน' : 'เร็วๆ นี้'}
      </span>
    </>
  );

  if (service.available && service.href) {
    return (
      <a className={className} href={service.href} style={{ animationDelay: `${180 + index * 90}ms` }}>
        {body}
      </a>
    );
  }

  return (
    <div className={className} style={{ animationDelay: `${180 + index * 90}ms` }}>
      {body}
    </div>
  );
}

export function App() {
  return (
    <div className="shell">
      <div className="atmosphere" aria-hidden="true" />
      <div className="grid-fade" aria-hidden="true" />

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
        <p className="lede">เลือกบริการส่วนตัวที่ต้องการใช้งาน</p>

        <ul className="service-list">
          {services.map((service, index) => (
            <li key={service.id}>
              <ServiceCard service={service} index={index} />
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
