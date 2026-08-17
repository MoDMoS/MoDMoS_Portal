import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto, UpdateRoleDto } from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  listPermissions() {
    return this.prisma.permission.findMany({
      orderBy: { code: 'asc' },
      select: { id: true, code: true, name: true },
    });
  }

  listRoles() {
    return this.prisma.role
      .findMany({
        orderBy: { code: 'asc' },
        include: {
          permissions: {
            include: {
              permission: { select: { id: true, code: true, name: true } },
            },
          },
        },
      })
      .then((roles) =>
        roles.map((role) => ({
          id: role.id,
          code: role.code,
          name: role.name,
          isSystem: role.isSystem,
          permissions: role.permissions.map((rp) => rp.permission),
        })),
      );
  }

  async createRole(dto: CreateRoleDto) {
    const code = dto.code.trim().toLowerCase();
    if (!/^[a-z0-9_-]+$/.test(code)) {
      throw new BadRequestException('รหัส role ใช้ได้เฉพาะ a-z, 0-9, _ และ -');
    }

    const existing = await this.prisma.role.findUnique({ where: { code } });
    if (existing) {
      throw new BadRequestException('รหัส role นี้มีแล้ว');
    }

    const permissions = await this.resolvePermissions(dto.permissionCodes);
    const role = await this.prisma.role.create({
      data: {
        code,
        name: dto.name.trim(),
        isSystem: false,
        permissions: {
          create: permissions.map((p) => ({ permissionId: p.id })),
        },
      },
      include: {
        permissions: {
          include: {
            permission: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });

    return {
      id: role.id,
      code: role.code,
      name: role.name,
      isSystem: role.isSystem,
      permissions: role.permissions.map((rp) => rp.permission),
    };
  }

  async updateRole(id: string, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) {
      throw new NotFoundException('ไม่พบ role');
    }

    if (dto.permissionCodes) {
      const permissions = await this.resolvePermissions(dto.permissionCodes);
      await this.prisma.$transaction([
        this.prisma.rolePermission.deleteMany({ where: { roleId: id } }),
        this.prisma.rolePermission.createMany({
          data: permissions.map((p) => ({
            roleId: id,
            permissionId: p.id,
          })),
        }),
        this.prisma.role.update({
          where: { id },
          data: dto.name ? { name: dto.name.trim() } : {},
        }),
      ]);
    } else if (dto.name) {
      await this.prisma.role.update({
        where: { id },
        data: { name: dto.name.trim() },
      });
    }

    return this.getRole(id);
  }

  async deleteRole(id: string) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) {
      throw new NotFoundException('ไม่พบ role');
    }
    if (role.isSystem) {
      throw new BadRequestException('ไม่สามารถลบ system role ได้');
    }
    await this.prisma.role.delete({ where: { id } });
    return { ok: true };
  }

  async listUsers() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        roles: {
          include: {
            role: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });

    return users.map((user) => this.mapUser(user));
  }

  async getUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        roles: {
          include: {
            role: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundException('ไม่พบผู้ใช้');
    }
    return this.mapUser(user);
  }

  async updateUser(
    userId: string,
    data: { name?: string; roleIds?: string[] },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('ไม่พบผู้ใช้');
    }

    if (data.roleIds) {
      await this.replaceUserRoles(userId, data.roleIds);
    }

    if (data.name !== undefined) {
      const name = data.name.trim();
      if (!name) {
        throw new BadRequestException('ชื่อต้องไม่ว่าง');
      }
      await this.prisma.user.update({
        where: { id: userId },
        data: { name },
      });
    }

    return this.getUser(userId);
  }

  async deleteUser(userId: string, actorId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('ไม่พบผู้ใช้');
    }
    if (actorId && actorId === userId) {
      throw new BadRequestException('ไม่สามารถลบบัญชีของตัวเองได้');
    }
    await this.prisma.user.delete({ where: { id: userId } });
    return { ok: true };
  }

  async updateUserRoles(userId: string, roleIds: string[]) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('ไม่พบผู้ใช้');
    }
    await this.replaceUserRoles(userId, roleIds);
    return this.getUser(userId);
  }

  private mapUser(user: {
    id: string;
    email: string;
    name: string;
    createdAt: Date;
    roles: Array<{ role: { id: string; code: string; name: string } }>;
  }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      roles: user.roles.map((ur) => ur.role),
    };
  }

  private async replaceUserRoles(userId: string, roleIds: string[]) {
    const uniqueRoleIds = [...new Set(roleIds)];
    if (uniqueRoleIds.length === 0) {
      throw new BadRequestException('ต้องมีอย่างน้อย 1 role');
    }

    const roles = await this.prisma.role.findMany({
      where: { id: { in: uniqueRoleIds } },
    });
    if (roles.length !== uniqueRoleIds.length) {
      throw new BadRequestException('มี role id ที่ไม่ถูกต้อง');
    }

    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { userId } }),
      this.prisma.userRole.createMany({
        data: uniqueRoleIds.map((roleId) => ({ userId, roleId })),
      }),
    ]);
  }

  private async getRole(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });
    if (!role) {
      throw new NotFoundException('ไม่พบ role');
    }
    return {
      id: role.id,
      code: role.code,
      name: role.name,
      isSystem: role.isSystem,
      permissions: role.permissions.map((rp) => rp.permission),
    };
  }

  private async resolvePermissions(codes: string[]) {
    const unique = [...new Set(codes.map((c) => c.trim()).filter(Boolean))];
    if (unique.length === 0) {
      throw new BadRequestException('ต้องมีอย่างน้อย 1 permission');
    }
    const permissions = await this.prisma.permission.findMany({
      where: { code: { in: unique } },
    });
    if (permissions.length !== unique.length) {
      throw new BadRequestException('มี permission code ที่ไม่ถูกต้อง');
    }
    return permissions;
  }
}
