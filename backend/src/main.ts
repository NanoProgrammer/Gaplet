import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1) Stripe y Square siguen con raw JSON
  app.use('/webhooks/stripe',  express.raw({ type: 'application/json' }));
  app.use('/webhooks/square',  express.raw({ type: 'application/json' }));

  // 2) Solo Acuity necesita urlencoded
  app.use(
    '/webhooks/acuity',
    bodyParser.urlencoded({ extended: true })
  );

  // 3) JSON parser para TODO lo demás
  app.use((req, res, next) => {
    const isRaw = ['/webhooks/stripe', '/webhooks/square', '/webhooks/acuity']
      .some(path => req.originalUrl.startsWith(path));
    if (isRaw) return next();
    return bodyParser.json()(req, res, next);
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
