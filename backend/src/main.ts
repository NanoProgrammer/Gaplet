import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  if(process.env.NODE_ENV === 'development') app.enableCors( {origin:"*", methods: "*", credentials: true } );
  if(process.env.NODE_ENV === 'production') {
    app.enableCors({
    origin:  'https://simuxel.vercel.app',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  }

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }))
  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
