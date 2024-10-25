import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsIn,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubscriptionDto {
  @ApiProperty({
    description: 'Unique identifier of the user',
    example: 'usr_123456789',
  })
  @IsNotEmpty()
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Unique identifier of the subscription plan',
    example: 'plan_premium_monthly',
  })
  @IsNotEmpty()
  @IsString()
  planId: string;

  @ApiProperty({
    description: 'Subscription amount to be charged periodically',
    example: 29.99,
    minimum: 0.01,
  })
  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiProperty({
    description: 'Currency for the subscription',
    enum: ['USD', 'EUR', 'GBP'],
    example: 'USD',
  })
  @IsNotEmpty()
  @IsString()
  @IsIn(['USD', 'EUR', 'GBP'])
  currency: string;

  @ApiProperty({
    description:
      'Initial payment amount (if different from regular subscription amount)',
    required: false,
    example: 9.99,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  initialPaymentAmount?: number;
}
