import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Raw body para webhooks de Stripe y Square
  app.use('/webhooks/stripe', express.raw({ type: 'application/json' }));
  app.use('/webhooks/square', express.raw({ type: 'application/json' }));

  // JSON parser para TODO lo demás (note que ya NO incluimos '/webhooks/email-response')
  const rawNeededRoutes = [
    '/webhooks/stripe',
    '/webhooks/square',
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

  // Pipes globales
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    })
  );

  await app.listen(process.env.PORT ?? 4000);
}

bootstrap();
