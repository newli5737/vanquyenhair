import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', true);

  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));
  app.use(cookieParser());

  app.enableCors({
    origin: [
      'https://vanquyenhair.vercel.app',
      'https://vanquyenhair.name.vn',

      'https://intention-asus-losing-stewart.trycloudflare.com',
      'https://missing-overall-cdt-preston.trycloudflare.com',

      'http://localhost:5173',
      'http://localhost:3000',
    ],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api/v1');

  const port = process.env.PORT || 8004;
  await app.listen(port, '0.0.0.0');

  console.log(`Backend running on http://0.0.0.0:${port}`);
}
bootstrap();
