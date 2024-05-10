import { ClientsModule, RmqOptions, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';

export const RmqPublisher = {
  queues: {
    api_gateway: 'API_GATEWAY_QUEUE',
    aml: 'AML_QUEUE',
    revolut: 'REVOLUT_QUEUE',
  },

  register(name: keyof typeof RmqPublisher.queues) {
    return ClientsModule.registerAsync([
      {
        name: RmqPublisher.queues[name],
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get('RMQ_URL') as string],
            queue: name,
          },
        }),
      },
    ]);
  },
};

@Injectable()
export class RmqConsumer {
  constructor(private configService: ConfigService) {}

  getOptions(queue: keyof typeof RmqPublisher.queues, options?: RmqOptions['options']) {
    return {
      transport: Transport.RMQ,
      options: {
        urls: [this.configService.get('RMQ_URL')],
        queue,
        ...options,
      },
    };
  }
}
