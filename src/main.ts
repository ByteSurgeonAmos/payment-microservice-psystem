import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

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
