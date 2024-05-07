import {
  Body,
  Controller,
  Get,
  MessageEvent,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { AckInterceptor, TransferEvent, TransferState } from '@forex-microservices/libs';
import { TransferDto } from '@forex-microservices/libs';
import { AppService } from './app.service';
import { TransferGuard } from './transfer/transfer.guard';
import { SupportingDocumentValidator } from './transfer/supporting_document_validator';
import { correlateTransfer } from './redis.utils';

@Controller()
export class AppController {
  constructor(private appService: AppService) {}

  @Post('transfers')
  @UseGuards(TransferGuard)
  @UseInterceptors(FileInterceptor('file') as any)
  @ApiConsumes('multipart/form-data')
  submitTransfer(@Body() body: TransferDto, @UploadedFile(SupportingDocumentValidator) file) {
    const correlation_id = this.appService.submitTransfer({
      ...body,
      supporting_document: file,
    });
    return { correlation_id };
  }

  @Get('transfers/:id')
  getTransaction(@Param('id') id: string, @Res() response: Response) {
    const subject = this.appService.transferSubjects[id];
    if (!subject) {
      return;
    }

    const observer = {
      next: (message: MessageEvent) => {
        if (message.type) {
          response.write(`event: ${message.type}\n`);
        }
        if (message.id) {
          response.write(`id: ${message.id}\n`);
        }
        if (message.retry) {
          response.write(`retry: ${message.retry}\n`);
        }

        response.write(`data: ${JSON.stringify(message.data)}\n\n`);
      },
      complete: () => {
        // TODO: do we need to do anything here ?
        console.log(`observer.complete`);
      },
      error: (err: any) => {
        console.log(`observer.error: ${err}`);
      },
    };
    subject.subscribe(observer);

    response.on('close', () => {
      console.log(`Closing connection for client `);
      subject.complete();
      this.appService.transferSubjects[id] = undefined;
      response.end();
    });

    // Send headers to establish SSE connection
    response.set({
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0, no-transform',
    });

    response.flushHeaders();
  }

  @EventPattern('aml.passed')
  @UseInterceptors(AckInterceptor)
  async onAmlPassed(@Payload() event: TransferEvent) {
    //console.log(this.configService.get('INSTANCE_NAME'), 'aml.passed', data);
    return await this.appService.processTransfer(event, true);
    /*if (success) {
      RmqPublisher.ack(context);
    }
    return { success };*/
  }

  @EventPattern('aml.failed')
  @UseInterceptors(AckInterceptor)
  async onAmlFailed(@Payload() event: TransferEvent) {
    //console.log(this.configService.get('INSTANCE_NAME'), 'aml.failed', data);
    return await this.appService.processTransfer(event, false);
  }

  @EventPattern('debit_account.balance_sufficient')
  @UseInterceptors(AckInterceptor)
  async onBalanceSufficient(@Payload() event: TransferEvent) {
    return await this.appService.processTransfer(event, true);
  }

  @EventPattern('debit_account.balance_insufficient')
  @UseInterceptors(AckInterceptor)
  async onBalanceInsufficient(@Payload() event: TransferEvent) {
    return await this.appService.processTransfer(event, false);
  }

  @EventPattern(TransferState.COMPLETED)
  @UseInterceptors(AckInterceptor)
  onTransferCompleted(@Payload() event) {
    if (!this.appService.transferSubjects[event.correlation_id]) {
      return;
    }

    this.appService.transferSubjects[event.correlation_id]?.next({
      type: correlateTransfer(event.correlation_id),
      data: {
        status: TransferState.COMPLETED,
        data: event.payload, // TODO: we want transaction id here
      },
    });

    // after 10s, if client hasn't closed the connection then we manually close it
    setTimeout(() => {
      // using this. to avoid closure
      this.appService.transferSubjects[event.correlation_id]?.complete();
      this.appService.transferSubjects[event.correlation_id] = undefined;
    }, 10000);

    return true;
  }
}
