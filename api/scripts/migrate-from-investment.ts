/**
 * One-shot: copy users (+ RBAC if still present) from Investment SQLite → Portal Postgres.
 *
 * Usage (from MoDMoS_Portal/api):
 *   INVESTMENT_SQLITE_PATH=../../Investment/backend/prisma/dev.db npm run migrate:from-investment
 *
 * Preserves user IDs so Investment ledger userId stays valid.
 * If Role/Permission tables were already dropped from SQLite, only users are copied;
 * Portal RbacBootstrap will seed roles and assign default `user` role.
 */
import { PrismaClient } from '@prisma/client';
import { DatabaseSync } from 'node:sqlite';
import * as path from 'node:path';

type Row = Record<string, unknown>;

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

function tableExists(db: DatabaseSync, name: string) {
  const row = db
    .prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
    )
    .get(name) as { name?: string } | undefined;
  return Boolean(row?.name);
}

function allRows(db: DatabaseSync, table: string): Row[] {
  if (!tableExists(db, table)) return [];
  return db.prepare(`SELECT * FROM ${table}`).all() as Row[];
}

async function main() {
  const sqlitePath = path.resolve(
    process.env.INVESTMENT_SQLITE_PATH?.trim() ||
      path.join(
        __dirname,
        '..',
        '..',
        '..',
        'Investment',
        'backend',
        'prisma',
        'dev.db',
      ),
  );

  requiredEnv('DATABASE_URL');
  const sqlite = new DatabaseSync(sqlitePath, { readOnly: true });
  const prisma = new PrismaClient();

  const permissions = allRows(sqlite, 'Permission');
  const roles = allRows(sqlite, 'Role');
  const rolePermissions = allRows(sqlite, 'RolePermission');
  const users = allRows(sqlite, 'User');
  const userRoles = allRows(sqlite, 'UserRole');

  console.log(
    `Source ${sqlitePath}: users=${users.length} roles=${roles.length} permissions=${permissions.length}`,
  );

  for (const p of permissions) {
    await prisma.permission.upsert({
      where: { id: String(p.id) },
      create: {
        id: String(p.id),
        code: String(p.code),
        name: String(p.name),
      },
      update: {
        code: String(p.code),
        name: String(p.name),
      },
    });
  }

  for (const r of roles) {
    await prisma.role.upsert({
      where: { id: String(r.id) },
      create: {
        id: String(r.id),
        code: String(r.code),
        name: String(r.name),
        isSystem: Boolean(r.isSystem),
      },
      update: {
        code: String(r.code),
        name: String(r.name),
        isSystem: Boolean(r.isSystem),
      },
    });
  }

  for (const rp of rolePermissions) {
    await prisma.rolePermission.upsert({
      where: { id: String(rp.id) },
      create: {
        id: String(rp.id),
        roleId: String(rp.roleId),
        permissionId: String(rp.permissionId),
      },
      update: {},
    });
  }

  for (const u of users) {
    await prisma.user.upsert({
      where: { id: String(u.id) },
      create: {
        id: String(u.id),
        email: String(u.email),
        name: String(u.name),
        passwordHash: String(u.passwordHash ?? ''),
      },
      update: {
        email: String(u.email),
        name: String(u.name),
        passwordHash: String(u.passwordHash ?? ''),
      },
    });
  }

  for (const ur of userRoles) {
    await prisma.userRole.upsert({
      where: { id: String(ur.id) },
      create: {
        id: String(ur.id),
        userId: String(ur.userId),
        roleId: String(ur.roleId),
      },
      update: {},
    });
  }

  await prisma.$disconnect();
  sqlite.close();
  console.log(
    'Migration complete. Restart Portal API so RbacBootstrap can assign default roles if needed.',
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
