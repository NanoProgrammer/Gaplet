import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Raw body for Stripe and Square webhooks (firma de verificación)
  app.use('/webhooks/stripe', express.raw({ type: 'application/json' }));
  app.use('/webhooks/square', express.raw({ type: 'application/json' }));

  // 🆕 URL-encoded parser para SendGrid email-response (manejo de formularios)
  app.use('/webhooks/email-response', express.urlencoded({ extended: true }));

  // JSON parser para todas las demás rutas
  const rawNeededRoutes = [
    '/webhooks/stripe',
    '/webhooks/square',
    '/webhooks/email-response',
  ];
  app.use((req, res, next) => {
    if (rawNeededRoutes.includes(req.originalUrl)) {
      return next();
    }
    bodyParser.json()(req, res, next);
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

  // Validaciones globales
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    })
  );

  await app.listen(process.env.PORT ?? 4000);
}

bootstrap();
