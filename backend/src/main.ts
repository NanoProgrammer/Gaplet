import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 🟢 Solo este endpoint acepta raw
  app.use('/webhooks/stripe', express.raw({ type: 'application/json' }));

  // 🔴 Este afecta TODO, así que debe ir después y con cuidado
  // Evitamos que rompa el webhook
  app.use((req, res, next) => {
    if (req.originalUrl === '/webhooks/stripe') {
      next(); // dejar raw
    } else {
      bodyParser.json()(req, res, next); // parsear JSON solo si NO es webhook
    }
  });

  // CORS
  if (process.env.NODE_ENV === 'development') {
    app.enableCors({ origin: '*', methods: '*', credentials: true });
  } else {
    app.enableCors({
      origin: 'https://gaplet.vercel.app',
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

