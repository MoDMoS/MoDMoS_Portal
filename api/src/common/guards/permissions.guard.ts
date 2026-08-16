import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  AUTH_ONLY_KEY,
  PERMISSIONS_KEY,
} from '../decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { AuthUser } from '../decorators/current-user.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const authOnly = this.reflector.getAllAndOverride<boolean>(AUTH_ONLY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const required = this.reflector.getAllAndOverride<string[] | undefined>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    if (authOnly) {
      return true;
    }

    const permissions = user.permissions ?? [];

    if (required !== undefined) {
      const missing = required.filter((code) => !permissions.includes(code));
      if (missing.length > 0) {
        throw new ForbiddenException('Insufficient permissions');
      }
      return true;
    }

    return true;
  }
}
