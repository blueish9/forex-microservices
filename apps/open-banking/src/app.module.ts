import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerMiddleware, RmqConsumer, RmqModule } from '@forex-microservices/libs';
import { RevolutModule } from './revolut/revolut.module';

const config = ConfigModule.forRoot({ isGlobal: true });

@Module({
  imports: [config, RmqModule.forRoot('api_gateway'), RevolutModule],
  providers: [RmqConsumer],
  // TODO: do we need to export RmqConsumer
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('revolut');
  }
}
