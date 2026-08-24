# Admin add user (username-capable)

อัปเดต: 2026-08-24

## Goal

Admin ที่ `/admin` สร้างบัญชีใหม่ได้ โดยใช้ **username** เป็นหลัก และ **email เป็น optional** — login ได้ทั้ง email หรือ username

## Data model

- `User.username` — `String? @unique` (normalize: trim + lowercase)
- `User.email` — `String? @unique` (เดิม required)
- ผู้ใช้เก่า: มี email, username = null
- ต้องมีอย่างน้อยหนึ่งใน email หรือ username

## API

- `POST /admin/users` (`admin:access`)
  - body: `username` (required), `name`, `password` (≥8), `email?`, `roleIds?`
  - ถ้าไม่ส่ง roleIds → assign role `user`
  - ไม่ issue session ให้ผู้สร้าง
- Login: คง key `email` ใน JSON แต่ค่าเป็น identifier (email หรือ username); หา user จากทั้งสองฟิลด์
- Self-register: ยังบังคับ email; ไม่บังคับ username
- Admin list/get/patch: รวม `username`; patch แก้ name / roles / username / email ได้

## UI

- ปุ่ม «เพิ่มผู้ใช้» บน `/admin` → `/admin/users/new`
- ฟอร์ม: username, name, password, confirm, email (optional), roles
- ตารางผู้ใช้แสดง username + email
- Login label: «อีเมลหรือชื่อผู้ใช้» (type=text)
- Profile / topbar: แสดง username หรือ email

## Out of scope

- Invite email / รหัสชั่วคราว
- บังคับ username บน self-register
