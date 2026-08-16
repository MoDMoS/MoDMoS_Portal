import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser = require('cookie-parser');
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const origin = process.env.FRONTEND_ORIGIN;
  if (origin) {
    app.enableCors({
      origin: origin.split(',').map((o) => o.trim()),
      credentials: true,
    });
  }

  await app.listen(process.env.PORT ?? 3001);
}

bootstrap();
