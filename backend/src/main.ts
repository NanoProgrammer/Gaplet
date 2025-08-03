// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Helper para guardar el buffer original
  const rawBodySaver = (req: any, res: any, buf: Buffer) => {
    if (buf && buf.length) {
      req.rawBody = buf;
    }
  };

  // 1) Stripe & Square: reciben JSON crudo
  app.use(
    '/webhooks/stripe',
    express.raw({ type: 'application/json', verify: rawBodySaver })
  );
  app.use(
    '/webhooks/square',
    express.raw({ type: 'application/json', verify: rawBodySaver })
  );

  // 3) Twilio SMS responses: también urlencoded
  app.use(
    '/webhooks/sms-response',
    bodyParser.urlencoded({
      extended: true,
      verify: rawBodySaver,
    })
  );

  // 4) JSON parser para todas las demás rutas
  app.use((req, res, next) => {
    const isWebhookPath = [
      '/webhooks/stripe',
      '/webhooks/square',
      '/webhooks/acuity',
      '/webhooks/sms-response',  // <-- agregado aquí
    ].some(path => req.originalUrl.startsWith(path));
    if (isWebhookPath) {
      return next();
    }
    // Para el resto, usamos JSON parser y también guardamos rawBody
    return bodyParser.json({ verify: rawBodySaver })(req, res, next);
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
