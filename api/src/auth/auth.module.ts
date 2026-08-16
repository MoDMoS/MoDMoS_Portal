import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { RbacModule } from '../rbac/rbac.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

function sessionMaxAgeSeconds(config: ConfigService) {
  const hours = Number(config.get<string>('SESSION_MAX_AGE_HOURS') ?? 12);
  if (Number.isFinite(hours) && hours > 0) {
    return Math.round(hours * 60 * 60);
  }
  return 12 * 60 * 60;
}

@Module({
  imports: [
    PassportModule,
    RbacModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('AUTH_SECRET'),
        signOptions: {
          expiresIn: sessionMaxAgeSeconds(config),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
