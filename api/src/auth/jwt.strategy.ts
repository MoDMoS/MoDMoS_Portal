import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';

function cookieExtractor(req: Request): string | null {
  const token = req.cookies?.access_token;
  return typeof token === 'string' ? token : null;
}

type JwtPayload = {
  sub: string;
  email: string;
  name?: string;
  roles?: string[];
  permissions?: string[];
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('AUTH_SECRET'),
    });
  }

  validate(payload: JwtPayload) {
    return {
      userId: payload.sub,
      email: payload.email,
      name: typeof payload.name === 'string' ? payload.name : '',
      roles: Array.isArray(payload.roles) ? payload.roles : [],
      permissions: Array.isArray(payload.permissions)
        ? payload.permissions
        : [],
    };
  }
}
