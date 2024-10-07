import { IsString, IsNotEmpty, IsNumber, Min, IsIn } from 'class-validator';

export class CreateSubscriptionDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsString()
  planId: string;

  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsNotEmpty()
  @IsString()
  @IsIn(['USD', 'EUR', 'GBP'])
  currency: string;

  @IsString()
  @IsIn(['USD', 'EUR', 'GBP'])
  initialPaymentAmount?: number;
}
