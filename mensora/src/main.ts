import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import session from 'express-session';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

   const docs = new DocumentBuilder()
  .setTitle('Mensora-API')
  .setDescription('Here you can find all of the endpoints of our Application, Mensora-IoT Solutions.')
  .setVersion('1.0')
  .build();

  const document = SwaggerModule.createDocument(app,docs);
  SwaggerModule.setup('docs',app,document);


  app.enableCors({
    origin: 'http://localhost:4200',
    credentials: true,
  });

  const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
  const sessionKey = config.sessionSecret;

  app.use(
    session({
      secret: sessionKey,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24, // 1 day
      },
    }),
  );

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
