import { TransferDto } from './transfer.dto';

export type TransferEvent = TransferDto & {
  correlation_id: string; // not to be mistaken with transfer uuid
};

export enum TransferState {
  SUBMITTED = 'transfer.submitted',
  CREATED = 'transfer.created',
  CONVERTED = 'transfer.converted',
  COMPLETED = 'transfer.completed', // beneficiary has received the money
}
