import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { ROLE_CODES } from '../rbac/rbac.constants';
import { RbacService } from '../rbac/rbac.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const INVALID_CREDENTIALS = 'อีเมล/ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly rbac: RbacService,
  ) {}

  async register(dto: RegisterDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
    }

    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException('อีเมลนี้ถูกใช้แล้ว');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email,
        name: dto.name.trim(),
        passwordHash,
      },
    });

    await this.rbac.assignRoleByCode(user.id, ROLE_CODES.USER);
    return this.issueSession(user);
  }

  async login(dto: LoginDto) {
    const identifier = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
    });
    if (!user) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    return this.issueSession(user);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, username: true, name: true },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    const claims = await this.rbac.getClaimsForUser(userId);
    return { ...user, ...claims };
  }

  async refresh(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        passwordHash: true,
      },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    return this.issueSession(user);
  }

  async updateProfile(userId: string, name: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { name: name.trim() },
      select: { id: true, email: true, username: true, name: true },
    });
    const claims = await this.rbac.getClaimsForUser(userId);
    return { ...user, ...claims };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ) {
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException();
    }
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      throw new BadRequestException('รหัสผ่านปัจจุบันไม่ถูกต้อง');
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    return { ok: true };
  }

  private async issueSession(user: {
    id: string;
    email: string | null;
    username?: string | null;
    name: string;
  }) {
    const claims = await this.rbac.getClaimsForUser(user.id);
    const email = user.email ?? user.username ?? '';
    const token = this.jwt.sign({
      sub: user.id,
      email,
      name: user.name,
      roles: claims.roles,
      permissions: claims.permissions,
    });
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username ?? null,
        name: user.name,
        ...claims,
      },
    };
  }
}
