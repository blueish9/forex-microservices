import { Inject, Injectable } from '@nestjs/common';
import { RmqPublisher, S3Service, TransferEvent } from '@forex-microservices/libs';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class AppService {
  constructor(
    @Inject(RmqPublisher.queues.api_gateway) private readonly apiQueue: ClientProxy,
    private s3Service: S3Service,
  ) {}

  async checkAml(event: TransferEvent) {
    if (event.supporting_document) {
      const file = await this.s3Service.generatePublicUrl(event.supporting_document);
      // TODO: validate file
    }

    return new Promise((resolve) => {
      // simulate checking process
      setTimeout(() => {
        if (event.amount > 999) {
          // TODO: delete file from S3
          this.apiQueue.emit('aml.failed', event);
        } else {
          this.apiQueue.emit('aml.passed', event);
        }
        resolve(true);
      }, 2000);
    });
  }
}
