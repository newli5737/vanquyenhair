import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Trust ALL proxies to correctly identify protocol from Cloudflare
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', true);

  app.use(cookieParser());

  app.enableCors({
    origin: (origin, callback) => {
      // Allow all origins to support tunnel and multiple local ports
      // In production with a fixed domain, you should specify it
      callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 8004;
  await app.listen(port);
  console.log(`Backend is running on port ${port}`);
}
bootstrap();
