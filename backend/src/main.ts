import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as multer from 'multer';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Raw body for Stripe and Square webhooks
  app.use('/webhooks/stripe', express.raw({ type: 'application/json' }));
  app.use('/webhooks/square', express.raw({ type: 'application/json' }));

  // ✅ Multer middleware for SendGrid email-response (multipart/form-data)
  const upload = multer(); // uses memoryStorage by default
  app.use('/webhooks/email-response', upload.none());

  // JSON parser for all other routes
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

  // CORS setup
  if (process.env.NODE_ENV === 'development') {
    app.enableCors({ origin: '*', methods: '*', credentials: true });
  } else {
    app.enableCors({
      origin: 'https://gaplets.com',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: true,
    });
  }

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    })
  );

  await app.listen(process.env.PORT ?? 4000);
}

bootstrap();
