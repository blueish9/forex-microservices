import { Inject, Injectable, InternalServerErrorException, MessageEvent } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import omit from 'lodash.omit';
import Redis from 'ioredis';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import Redlock, { ResourceLockedError } from 'redlock';
import { nanoid } from 'nanoid';
import { BehaviorSubject, ReplaySubject, Subject } from 'rxjs';
import {
  RmqPublisher,
  S3Service,
  TransferDto,
  TransferEvent,
  TransferState,
} from '@forex-microservices/libs';
import { correlateTransfer } from './redis.utils';

@Injectable()
export class AppService {
  private redlock: Redlock;
  private redis: Redis;

  /**
   * use BehaviorSubject for the sake of simplicity, but it will not work with load balancer.
   * when there's more than one instance of this service, we will need a centralized persistent layer
   */
  public transferSubjects = {} as Record<string, BehaviorSubject<MessageEvent> | undefined>;

  constructor(
    @Inject(RmqPublisher.queues.aml) private readonly amlQueue: ClientProxy,
    @Inject(RmqPublisher.queues.revolut) private readonly revolutQueue: ClientProxy,

    // TODO: pick correct queue
    @Inject(RmqPublisher.queues.revolut) private readonly ledgerQueue: ClientProxy,
    //@InjectRedis() private readonly redis: Redis,
    private s3Service: S3Service,
  ) {
    /*this.redlock = new Redlock([redis], {
      driftFactor: 0.01, // multiplied by lock ttl to determine drift time
      retryCount: 10,
      retryDelay: 200, // time in ms
      retryJitter: 200, // time in ms
      automaticExtensionThreshold: 500, // time in ms
    });
    this.redlock.on('error', (error) => {
      // Ignore cases where a resource is explicitly marked as locked on a client.
      if (error instanceof ResourceLockedError) {
        return;
      }
      console.error('Redlock error', error);
    });*/
  }

  async submitTransfer(data: TransferDto) {
    const file = await this.s3Service.upload(data.supporting_document);
    if (!file) {
      throw new InternalServerErrorException('Server failed to upload the supporting document');
    }

    const correlation_id = nanoid();
    const payload = {
      correlation_id,
      ...omit(data, ['supporting_document']),
    };
    this.amlQueue.emit(TransferState.SUBMITTED, {
      ...payload,
      supporting_document: file.name,
    });
    this.revolutQueue.emit(TransferState.SUBMITTED, payload);

    const transferId = correlateTransfer(correlation_id);
    this.transferSubjects[correlation_id] = new BehaviorSubject({
      type: transferId,
      data: {
        status: TransferState.SUBMITTED,
      },
    });
    return transferId;
  }

  processTransfer(event: TransferEvent, success: boolean) {
    const transferId = correlateTransfer(event.correlation_id);
    return this.redlock.using([transferId], 5000, async (signal) => {
      // https://www.enterpriseintegrationpatterns.com/patterns/messaging/Aggregator.html
      const aggregator = await this.redis.get(transferId);

      // we have 2 checks in total, if already passed 1 check then this next check will initiate the transfer
      if (aggregator === PASSED_1_CHECK) {
        if (success) {
          this.ledgerQueue.emit(TransferState.CREATED, event);

          // TODO: test client for the order of events
          this.transferSubjects[event.correlation_id]?.next({
            type: transferId,
            data: {
              status: TransferState.CREATED,
            },
          });
        }

        if (signal.aborted) {
          console.log('processTransfer signal.aborted', signal.error);
          return false;
          //throw signal.error;
        }
        const result = await this.redis.del(transferId);
        return result === 1;
      }

      if (!aggregator) {
        if (signal.aborted) {
          console.log('processTransfer signal.aborted', signal.error);
          return false;
          //throw signal.error;
        }

        const result = await this.redis.set(transferId, PASSED_1_CHECK);
        return result === 'OK';
      }

      return false;
    });
  }
}

const PASSED_1_CHECK = 'PASSED_1_CHECK';
