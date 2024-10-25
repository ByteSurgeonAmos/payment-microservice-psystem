import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const config = new DocumentBuilder()
    .setTitle('Payment Service')
    .setDescription('API Documentation for Payments for Enterprise with Paypal')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: false,
      exceptionFactory: (errors) => {
        logger.error('Validation failed', errors);
        throw errors;
      },
    }),
  );

  app.enableCors();

  app.use((req, res, next) => {
    logger.log(`${req.method} ${req.url}`);
    next();
  });

  await app.listen(5000);
  logger.log('Application is running on: http://localhost:5000');
}
bootstrap();
