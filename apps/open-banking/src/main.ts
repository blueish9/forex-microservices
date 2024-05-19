import { NestFactory } from '@nestjs/core';
import { RmqConsumer } from '@forex-microservices/libs';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const rmqConsumer = app.get<RmqConsumer>(RmqConsumer);

  app.connectMicroservice(rmqConsumer.getOptions('revolut'));

  await app.startAllMicroservices();
  await app.listen(3000);
}

bootstrap();
