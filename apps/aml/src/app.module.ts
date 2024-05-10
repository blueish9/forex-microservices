import { Module } from '@nestjs/common';

import { ConfigModule } from '@nestjs/config';
import { RmqPublisher, S3Module } from '@forex-microservices/libs';
import { AppController } from './app.controller';
import { AppService } from './app.service';

const config = ConfigModule.forRoot({ isGlobal: true });

const rmq = RmqPublisher.register('api_gateway');

@Module({
  imports: [config, rmq, S3Module],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
