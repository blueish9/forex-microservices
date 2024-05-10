import { Controller, UseInterceptors } from '@nestjs/common';

import { AckInterceptor, TransferEvent, TransferState } from '@forex-microservices/libs';
import { Ctx, EventPattern, RmqContext } from '@nestjs/microservices';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @EventPattern(TransferState.SUBMITTED)
  @UseInterceptors(AckInterceptor)
  onInitTransfer(@Ctx() context: RmqContext, event: TransferEvent) {
    return this.appService.checkAml(event);
  }
}
