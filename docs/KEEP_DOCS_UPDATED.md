# นโยบายอัปเดตเอกสาร (Keep Docs Updated)

อัปเดต: 2026-08-24

เอกสารนี้เป็น **กฎสำหรับมนุษย์และเอเจนต์** — เมื่อมีการแก้ไขโค้ดที่กระทบระบบ ต้องอัปเดต docs ใน PR/commit เดียวกัน

กฎ Cursor ที่บังคับในแชท: `.cursor/rules/keep-docs-updated.mdc` (มีในทุก repo ของ MoDMoS)

---

## หลักการ

1. **โค้ดกับ docs ต้องไม่ล้าหลังกัน** — ถ้าเปลี่ยนพฤติกรรมที่ผู้ใช้หรือ dev อื่นต้องรู้ ให้แก้ docs พร้อมกัน
2. **อัปเดตเฉพาะที่กระทบ** — ไม่เขียนเรียงความใหม่ทั้งเล่มถ้าเปลี่ยนแค่จุดเดียว
3. **วันที่อัปเดต** — ใส่/แก้บรรทัด `อัปเดต: YYYY-MM-DD` ที่หัวเอกสารที่แก้

---

## เมื่อไหร่ต้องอัปเดต

| ประเภทการแก้โค้ด | ต้องแตะ docs |
|------------------|--------------|
| API path / request-response / auth-permission | ใช่ — ARCHITECTURE / USER_GUIDE / SYSTEM_FLOW / README ตามที่เกี่ยว |
| Env ใหม่หรือเปลี่ยนความหมาย | ใช่ — `.env.example` + docs deploy/VPS + ARCHITECTURE |
| Pipeline / cron / strategy / execution mode | ใช่ — SYSTEM_FLOW หรือ ARCHITECTURE ของ Gold |
| หน้า UI ใหม่หรือเปลี่ยนเมนูหลัก | ใช่ — USER_GUIDE หรือ README ของแอปนั้น |
| Nginx path / พอร์ต / deploy script | ใช่ — `MoDMoS_Portal/docs/VPS.md` + ecosystem-overview |
| โมเดล DB / migration สำคัญ | ใช่ — ARCHITECTURE + (ถ้าข้ามบริการ) ecosystem-overview |
| แก้บั๊กเล็ก / rename ในไฟล์ / style-only | ไม่บังคับ เว้นแต่เปลี่ยนพฤติกรรมที่ user เห็น |

---

## แผนที่เอกสารหลัก

| ขอบเขต | ไฟล์ |
|--------|------|
| ทั้งระบบ 4 repo | `MoDMoS_Portal/docs/ecosystem-overview.md` |
| Deploy / พอร์ต / SSO บน VPS | `MoDMoS_Portal/docs/VPS.md` |
| Portal | `MoDMoS_Portal/README.md` |
| Investment | `Investment/docs/ARCHITECTURE.md`, `Investment/README.md`, `Investment/docs/vps-setup.md` |
| Gold Agent | `Gold_agent/docs/ARCHITECTURE.md`, `SYSTEM_FLOW.md`, `USER_GUIDE.md`, `docs/superpowers/specs/*` |
| Discord Bot | `MoDMoS_Bot_Discord/docs/system-overview.md` |

ฟีเจอร์ใหญ่ของ Gold ที่ออกแบบก่อนลงมือ: เขียน/อัปเดต spec ใน `Gold_agent/docs/superpowers/specs/` ตาม workflow ของโปรเจกต์

---

## Checklist ก่อนจบงาน

- [ ] พฤติกรรมใหม่สอดคล้องกับ docs ที่ user/dev อ่าน
- [ ] env ใหม่มีใน `.env.example` (ไม่มีค่า secret จริง)
- [ ] ถ้ากระทบ URL/พอร์ต/สิทธิ์ข้ามแอป → อัปเดต `ecosystem-overview.md` และ/หรือ `VPS.md`
- [ ] ไม่ลบ docs ที่ยังอ้างอิงอยู่โดยไม่ย้ายลิงก์
