import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 🟢 Webhook de Stripe – raw body para firma
  app.use('/webhooks/stripe', express.raw({ type: 'application/json' }));

  // 🟢 Webhook de Square – raw body para firma
  app.use('/webhooks/square', bodyParser.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf.toString();
    },
  }));

  // 🔴 El resto de rutas sí puede usar JSON parseado normalmente
  app.use((req, res, next) => {
    if (req.originalUrl === '/webhooks/stripe' || req.originalUrl === '/webhooks/square') {
      next(); // dejar raw en estos dos
    } else {
      bodyParser.json()(req, res, next); // aplicar body parser normal
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

  // Pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
