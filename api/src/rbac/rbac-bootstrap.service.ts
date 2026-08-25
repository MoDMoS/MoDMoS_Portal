import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import {
  PERMISSION_CATALOG,
  PERMISSION_CODES,
  ROLE_CODES,
} from './rbac.constants';

@Injectable()
export class RbacBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(RbacBootstrapService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    await this.ensureCatalog();
    await this.ensureDefaultAdmin();
    await this.ensureUsersHaveDefaultRole();
  }

  private async ensureCatalog() {
    for (const item of PERMISSION_CATALOG) {
      await this.prisma.permission.upsert({
        where: { code: item.code },
        create: { code: item.code, name: item.name },
        update: { name: item.name },
      });
    }

    const permissions = await this.prisma.permission.findMany();
    const byCode = new Map(permissions.map((p) => [p.code, p]));

    const adminRole = await this.prisma.role.upsert({
      where: { code: ROLE_CODES.ADMIN },
      create: {
        code: ROLE_CODES.ADMIN,
        name: 'Admin',
        isSystem: true,
      },
      update: { name: 'Admin', isSystem: true },
    });

    const userRole = await this.prisma.role.upsert({
      where: { code: ROLE_CODES.USER },
      create: {
        code: ROLE_CODES.USER,
        name: 'User',
        isSystem: true,
      },
      update: { name: 'User', isSystem: true },
    });

    for (const permission of permissions) {
      await this.prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: adminRole.id,
            permissionId: permission.id,
          },
        },
        create: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
        update: {},
      });
    }

    const userPermissionCodes = [
      PERMISSION_CODES.SERVICE_INVESTMENT,
      PERMISSION_CODES.SERVICE_GOLD_AGENT,
      PERMISSION_CODES.SERVICE_TRIP_PLANNER,
    ];
    for (const code of userPermissionCodes) {
      const permission = byCode.get(code);
      if (!permission) continue;
      await this.prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: userRole.id,
            permissionId: permission.id,
          },
        },
        create: {
          roleId: userRole.id,
          permissionId: permission.id,
        },
        update: {},
      });
    }
  }

  private async ensureDefaultAdmin() {
    const enabled =
      this.config.get<string>('DEFAULT_ADMIN_ENABLED')?.trim() === 'true';
    if (!enabled) {
      return;
    }

    const email = this.config
      .get<string>('DEFAULT_ADMIN_EMAIL')
      ?.trim()
      .toLowerCase();
    const password = this.config.get<string>('DEFAULT_ADMIN_PASSWORD');
    const name =
      this.config.get<string>('DEFAULT_ADMIN_NAME')?.trim() || 'Admin';

    if (!email || !password) {
      this.logger.warn(
        'DEFAULT_ADMIN_ENABLED=true but email/password missing; skip bootstrap admin',
      );
      return;
    }

    const adminRole = await this.prisma.role.findUnique({
      where: { code: ROLE_CODES.ADMIN },
    });
    if (!adminRole) {
      this.logger.warn('Admin role missing; skip bootstrap admin');
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const existing = await this.prisma.user.findUnique({ where: { email } });

    if (!existing) {
      const user = await this.prisma.user.create({
        data: {
          email,
          name,
          passwordHash,
          roles: { create: { roleId: adminRole.id } },
        },
      });
      this.logger.log(`Default admin created: ${user.email}`);
      return;
    }

    await this.prisma.user.update({
      where: { id: existing.id },
      data: { name, passwordHash },
    });
    await this.prisma.userRole.upsert({
      where: {
        userId_roleId: { userId: existing.id, roleId: adminRole.id },
      },
      create: { userId: existing.id, roleId: adminRole.id },
      update: {},
    });
    this.logger.log(`Default admin upserted: ${email}`);
  }

  private async ensureUsersHaveDefaultRole() {
    const userRole = await this.prisma.role.findUnique({
      where: { code: ROLE_CODES.USER },
    });
    if (!userRole) return;

    const usersWithoutRoles = await this.prisma.user.findMany({
      where: { roles: { none: {} } },
      select: { id: true },
    });

    for (const user of usersWithoutRoles) {
      await this.prisma.userRole.create({
        data: { userId: user.id, roleId: userRole.id },
      });
    }

    if (usersWithoutRoles.length > 0) {
      this.logger.log(
        `Assigned default user role to ${usersWithoutRoles.length} existing user(s)`,
      );
    }
  }
}
