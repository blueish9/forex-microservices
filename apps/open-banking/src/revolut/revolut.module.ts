import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RmqPublisher } from '@forex-microservices/libs';
import { RevolutService } from './revolut.service';
import { RevolutController } from './revolut.controller';

const config = ConfigModule.forRoot({ isGlobal: true });

const revolutClient = HttpModule.registerAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    baseURL: configService.get('REVOLUT_API'),
    timeout: 30 * 1000,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  }),
});

@Module({
  imports: [config, revolutClient, RmqPublisher.register('api_gateway')],
  controllers: [RevolutController],
  providers: [RevolutService],
})
export class RevolutModule {}
