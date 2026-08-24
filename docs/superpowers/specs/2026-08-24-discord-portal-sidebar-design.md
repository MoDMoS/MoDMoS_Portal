# Discord Portal sidebar layout

อัปเดต: 2026-08-24

## Goal

หน้า `/discord` ใน Portal ไม่เลื่อนยาวผ่านหลาย section — แยกเป็น sidebar + URL ต่อเรื่อง และสถานะบอทอยู่หัวตลอด

## Layout

- `DiscordLayout`: TopBar + สถานะ runtime + sidebar + `<Outlet />`
- สถานะ (Ready / DB / Bot / Guilds / Uptime / Port) แสดงทุกเมนู
- Sidebar collapse ได้ (localStorage) สไตล์เดียวกับ Admin

## Routes

| Path | เมนู |
|------|------|
| `/discord` | redirect → `/discord/announcements` |
| `/discord/announcements` | ประกาศตามเวลา |
| `/discord/roster` | สมาชิก (roster) |
| `/discord/logs` | ล็อกล่าสุด |

## Permission

- เข้า Discord UI: `service:discord` หรือ `admin:access`
- `GET /logs` (bot): เปลี่ยนเป็น `service:discord` หรือ `admin:access` (เดิม `admin:access` เท่านั้น)

## Out of scope

- ไม่เปลี่ยน business logic ประกาศ/roster
- ไม่มีเมนู «ภาพรวม» แยก
