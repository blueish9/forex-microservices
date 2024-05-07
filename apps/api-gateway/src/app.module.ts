import { Module } from '@nestjs/common';

import { ConfigModule, ConfigService } from '@nestjs/config';
import { RmqPublisher, S3Module } from '@forex-microservices/libs';
import { RedisModule } from '@liaoliaots/nestjs-redis';
import { AppController } from './app.controller';
import { AppService } from './app.service';

const config = ConfigModule.forRoot({ isGlobal: true });

const rmqModules = [RmqPublisher.register('api_gateway'), RmqPublisher.register('aml')];

/*const redis = RedisModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    config: {
      host: configService.get('REDIS_HOST'),
      port: 6379,
    },
  }),
});*/

@Module({
  imports: [config, ...rmqModules, S3Module],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
