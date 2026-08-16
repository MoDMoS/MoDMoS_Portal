import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type RbacClaims = {
  roles: string[];
  permissions: string[];
};

@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService) {}

  async getClaimsForUser(userId: string): Promise<RbacClaims> {
    const rows = await this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
      },
    });

    const roles = rows.map((row) => row.role.code);
    const permissionSet = new Set<string>();
    for (const row of rows) {
      for (const rp of row.role.permissions) {
        permissionSet.add(rp.permission.code);
      }
    }

    return {
      roles: [...roles].sort(),
      permissions: [...permissionSet].sort(),
    };
  }

  async assignRoleByCode(userId: string, roleCode: string) {
    const role = await this.prisma.role.findUnique({ where: { code: roleCode } });
    if (!role) {
      throw new BadRequestException(`Role not found: ${roleCode}`);
    }
    await this.prisma.userRole.upsert({
      where: {
        userId_roleId: { userId, roleId: role.id },
      },
      create: { userId, roleId: role.id },
      update: {},
    });
  }
}
