import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 🟢 Webhook de Stripe – raw body para firma
  app.use('/webhooks/stripe', express.raw({ type: 'application/json' }));

  // ✅ Webhook de Square – también raw
  app.use('/webhooks/square', express.raw({ type: 'application/json' }));

  // 🔴 El resto de rutas puede usar body-parser normal
  app.use((req, res, next) => {
    if (
      req.originalUrl === '/webhooks/stripe' ||
      req.originalUrl === '/webhooks/square'
    ) {
      next(); // no parsear
    } else {
      bodyParser.json()(req, res, next);
    }
  });

  // CORS
  if (process.env.NODE_ENV === 'development') {
    app.enableCors({ origin: '*', methods: '*', credentials: true });
  } else {
    app.enableCors({
      origin: 'https://gaplets.com',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: true,
    });
  }

  // Global Pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
