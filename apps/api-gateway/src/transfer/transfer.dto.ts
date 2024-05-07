import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString } from 'class-validator';

export class TransferDto {
  @ApiProperty()
  @IsInt()
  amount: string;

  @ApiProperty()
  @IsString()
  source_account_id: string;

  @ApiProperty()
  @IsString()
  source_currency: string;

  @ApiProperty()
  @IsString()
  target_account_id: string;

  @ApiProperty()
  @IsString()
  target_currency: string;

  @ApiProperty({ type: 'string', format: 'binary' })
  supporting_document?: any;
}
