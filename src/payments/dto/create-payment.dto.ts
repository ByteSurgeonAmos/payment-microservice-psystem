import { IsNumber, IsString, IsNotEmpty, Min, IsIn } from 'class-validator';

export class CreatePaymentDto {
  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsNotEmpty()
  @IsString()
  @IsIn(['USD', 'EUR', 'GBP'])
  currency: string;
}
