export type Service = {
  id: string;
  name: string;
  description: string;
  href?: string;
  available: boolean;
};

function url(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

const investmentUrl = url(import.meta.env.VITE_INVESTMENT_URL);
const goldAgentUrl = url(import.meta.env.VITE_GOLD_AGENT_URL);

export const services: Service[] = [
  {
    id: 'investment',
    name: 'บันทึกการลงทุน',
    description: 'แลกเงิน ซื้อขายหุ้นไทย/นอก ปันผล และภาพรวมพอร์ต',
    href: investmentUrl,
    available: Boolean(investmentUrl),
  },
  {
    id: 'gold-agent',
    name: 'Gold Agent',
    description: 'ราคาทองคำ สัญญาณเทรด และกราฟแท่งเทียน',
    href: goldAgentUrl,
    available: Boolean(goldAgentUrl),
  },
];
