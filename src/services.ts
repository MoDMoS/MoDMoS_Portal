export type Service = {
  id: string;
  name: string;
  description: string;
  href?: string;
  available: boolean;
  permission: string;
  /** Same-origin Portal route (use React Router Link) */
  internal?: boolean;
};

function url(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

const investmentUrl = url(import.meta.env.VITE_INVESTMENT_URL);
const goldAgentUrl = url(import.meta.env.VITE_GOLD_AGENT_URL);

export const services: Service[] = [
  {
    id: 'admin',
    name: 'Admin',
    description: 'จัดการผู้ใช้ บทบาท และสิทธิ์เข้าถึงบริการ',
    href: '/admin',
    available: true,
    permission: 'admin:access',
    internal: true,
  },
  {
    id: 'investment',
    name: 'บันทึกการลงทุน',
    description: 'แลกเงิน ซื้อขายหุ้นไทย/นอก ปันผล และภาพรวมพอร์ต',
    href: investmentUrl,
    available: Boolean(investmentUrl),
    permission: 'service:investment',
  },
  {
    id: 'gold-agent',
    name: 'Gold Agent',
    description: 'ราคาทองคำ สัญญาณเทรด และกราฟแท่งเทียน',
    href: goldAgentUrl,
    available: Boolean(goldAgentUrl),
    permission: 'service:gold-agent',
  },
  {
    id: 'discord',
    name: 'Discord Bot',
    description: 'สถานะบอท รายชื่อสมาชิก และล็อกล่าสุดบน VPS',
    href: '/discord',
    available: true,
    permission: 'service:discord',
    internal: true,
  },
];
