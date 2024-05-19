import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { Ctx, EventPattern, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { AckInterceptor, TransferEvent, TransferState } from '@forex-microservices/libs';
import { RevolutService } from './revolut.service';

@Controller('revolut')
export class RevolutController {
  constructor(private revolutService: RevolutService) {}

  @Get('authenticate')
  authenticate() {
    this.revolutService.authenticate();
  }

  @EventPattern(TransferState.SUBMITTED)
  @UseInterceptors(AckInterceptor)
  onSubmitTransfer(@Ctx() context: RmqContext, @Payload() event: TransferEvent) {
    return this.revolutService.checkBalance(event);
  }

  @EventPattern(TransferState.CREATED)
  @UseInterceptors(AckInterceptor)
  onCreateTransfer(@Ctx() context: RmqContext, @Payload() event: TransferEvent) {
    return this.revolutService.exchange(event);
  }
}
