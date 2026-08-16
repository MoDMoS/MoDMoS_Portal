import { Body, Controller, Get, Patch, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthOnly } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

const COOKIE = 'access_token';

function sessionMaxAgeMs() {
  const hours = Number(process.env.SESSION_MAX_AGE_HOURS);
  if (Number.isFinite(hours) && hours > 0) {
    return hours * 60 * 60 * 1000;
  }
  return 12 * 60 * 60 * 1000;
}

@Controller('auth')
@AuthOnly()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.register(dto);
    this.setCookie(res, result.token);
    return result.user;
  }

  @Public()
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(dto);
    this.setCookie(res, result.token);
    return result.user;
  }

  @Public()
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(COOKIE, cookieOptions());
    return { ok: true };
  }

  @Get('me')
  me(@CurrentUser() user: { userId: string }) {
    return this.auth.me(user.userId);
  }

  @Post('refresh')
  async refresh(
    @CurrentUser() user: { userId: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.refresh(user.userId);
    this.setCookie(res, result.token);
    return result.user;
  }

  @Patch('profile')
  updateProfile(
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.auth.updateProfile(user.userId, dto.name);
  }

  @Patch('password')
  changePassword(
    @CurrentUser() user: { userId: string },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.auth.changePassword(
      user.userId,
      dto.currentPassword,
      dto.newPassword,
      dto.confirmPassword,
    );
  }

  private setCookie(res: Response, token: string) {
    res.cookie(COOKIE, token, {
      ...cookieOptions(),
      maxAge: sessionMaxAgeMs(),
    });
  }
}

function cookieSecure() {
  const raw = process.env.COOKIE_SECURE;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return process.env.NODE_ENV === 'production';
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: cookieSecure(),
    path: '/',
  };
}
