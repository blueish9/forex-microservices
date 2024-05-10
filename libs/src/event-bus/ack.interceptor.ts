import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { tap } from 'rxjs';

@Injectable()
export class AckInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(
      // TODO: test if can handle Promise from async
      tap((result) => {
        if (result) {
          const rmqContext = context.getArgByIndex(RMQ_CONTEXT_INDEX);
          const channel = rmqContext.getChannelRef();
          const message = rmqContext.getMessage();
          channel.ack(message);
          console.log('AckInterceptor', message);
        }
      }),
    );
  }
}

// we must place `@Ctx() context: RmqContext` at index 0 for this to work
const RMQ_CONTEXT_INDEX = 0;
