import { Inject, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Revolut, RmqPublisher, TransferEvent, TransferState } from '@forex-microservices/libs';
import { ClientProxy } from '@nestjs/microservices';
import { Interval } from '@nestjs/schedule';

@Injectable()
export class RevolutService {
  auth?: Revolut.Auth;
  bearerInterceptor?: number;

  constructor(
    private configService: ConfigService,
    private readonly revolutClient: HttpService,
    @Inject(RmqPublisher.queues.api_gateway) private readonly apiQueue: ClientProxy,
  ) {
    revolutClient.axiosRef.interceptors.request.use((config) => {
      console.log(
        '\x1b[46m',
        'Revolut request',
        '\x1b[0m',
        config.method.toUpperCase(),
        config.url,
        config.params || config.data,
      );
      return config;
    });
    revolutClient.axiosRef.interceptors.response.use((response) => {
      console.log(
        '\x1b[46m',
        'Revolut response',
        '\x1b[0m',
        response.config.method.toUpperCase(),
        response.config.url,
        response.status,
        response.data,
      );
      return response;
    });

    this.authenticate();
  }

  @Interval(30 * 60 * 1000) // TTL is 40 minutes
  async authenticate() {
    const response = await this.revolutClient.axiosRef.post(
      'auth/token',
      {
        grant_type: 'refresh_token',
        refresh_token: this.configService.get('REVOLUT_REFRESH_TOKEN'),
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: this.configService.get('REVOLUT_CLIENT_JWT'),
      },
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      },
    );
    // TODO: need retry mechanism if failed
    if (response?.status === 200 && response?.data) {
      this.auth = response.data;
      if (!this.bearerInterceptor) {
        this.bearerInterceptor = this.revolutClient.axiosRef.interceptors.request.use((config) => {
          config.headers.Authorization = 'Bearer ' + this.auth.access_token;
          return config;
        });
      }
    }
  }

  async checkBalance(event: TransferEvent) {
    const response = await this.revolutClient.axiosRef.get('accounts/' + event.source_account_id);
    if (response?.status === 200 && response?.data) {
      const account: Revolut.Account = response.data;
      const remainingBalance = account.balance - event.amount >= 0;
      this.apiQueue.emit(
        remainingBalance > 0
          ? 'debit_account.balance_sufficient'
          : 'debit_account.balance_insufficient',
        event,
      );
      return remainingBalance;
    }
  }

  async exchange(event: TransferEvent) {
    const response = await this.revolutClient.axiosRef.post('exchange', {
      from: {
        account_id: event.source_account_id,
        currency: event.source_currency,
        amount: event.amount,
      },
      to: {
        account_id: event.target_account_id,
        currency: event.target_currency,
      },

      reference: 'exchange',
      request_id: event.correlation_id,
    });
    if (response?.status === 200 && response?.data) {
      const data: Revolut.ExchangeResponse = response.data;
      // TODO: check other states
      if (data.state === 'completed') {
        this.apiQueue.emit(TransferState.CONVERTED, event);
      }
    }
    return true;
  }
}
