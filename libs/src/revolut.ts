// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Revolut {
  export type Auth = {
    access_token: string;
    expires_in: number;
  };

  export type Account = {
    id: string;
    name: string;
    balance: number;
    currency: string;
  };

  export type Quote = {
    from: {
      account_id: string;
      currency: string;
      amount: number;
    };
    to: {
      account_id: string;
      currency: string;
    };
    reference?: string;
    request_id: string;
  };

  export type TransactionState =
    | 'created'
    | 'pending'
    | 'completed'
    | 'declined'
    | 'failed'
    | 'reverted';

  export type ExchangeResponse = {
    id: string;
    state: TransactionState;
    reason_code?: string;
  };

  export type WebhookTransactionCreated = {
    event: 'TransactionCreated';
    timestamp: string;
    data: {
      id: string;
      legs: [
        TransactionLeg & {
          bill_amount: number;
          bill_currency: string;
        },
        TransactionLeg & {
          fee: number;
        },
      ];
      type: 'exchange';
      state: TransactionState;
      reference: string;
      created_at: string;
      request_id: string;
      updated_at: string;
      completed_at: string;
    };
  };
}

type TransactionLeg = {
  amount: number;
  leg_id: string;
  balance: number;
  currency: string;
  account_id: string;
  description: string;
};
