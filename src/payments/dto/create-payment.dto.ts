import {
  IsNumber,
  IsString,
  IsEnum,
  IsOptional,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CardDetailsDto {
  @ApiProperty({
    description: 'Card number',
    example: '4111111111111111',
  })
  @IsString()
  number: string;

  @ApiProperty({
    description: 'Card expiration month',
    example: '12',
  })
  @IsString()
  expirationMonth: string;

  @ApiProperty({
    description: 'Card expiration year',
    example: '2025',
  })
  @IsString()
  expirationYear: string;

  @ApiProperty({
    description: 'Card security code',
    example: '123',
  })
  @IsString()
  securityCode: string;

  @ApiProperty({
    description: 'Cardholder name',
    example: 'John Doe',
  })
  @IsString()
  name: string;
}

export class BillingAddressDto {
  @ApiProperty({
    description: 'Street address line 1',
    example: '123 Main St',
  })
  @IsString()
  addressLine1: string;

  @ApiProperty({
    description: 'Street address line 2',
    example: 'Apt 4B',
    required: false,
  })
  @IsOptional()
  @IsString()
  addressLine2?: string;

  @ApiProperty({
    description: 'City',
    example: 'San Francisco',
  })
  @IsString()
  adminArea2: string;

  @ApiProperty({
    description: 'State/Province/Region',
    example: 'CA',
  })
  @IsString()
  adminArea1: string;

  @ApiProperty({
    description: 'Postal code',
    example: '94105',
  })
  @IsString()
  postalCode: string;

  @ApiProperty({
    description: 'Two-letter country code',
    example: 'US',
  })
  @IsString()
  countryCode: string;
}

export class CreatePaymentDto {
  @ApiProperty({
    description: 'Payment amount',
    example: 99.99,
    minimum: 0,
  })
  @IsNumber()
  amount: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'USD',
  })
  @IsString()
  currency: string;

  @ApiProperty({
    description: 'User ID',
    example: 'usr_123456789',
  })
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: 'Payment method',
    enum: ['paypal', 'card'],
    example: 'card',
  })
  @IsEnum(['paypal', 'card'])
  paymentMethod: 'paypal' | 'card';

  @ApiProperty({
    description: 'Card details (required if payment method is card)',
    type: CardDetailsDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CardDetailsDto)
  cardDetails?: CardDetailsDto;

  @ApiProperty({
    description: 'Billing address (required if payment method is card)',
    type: BillingAddressDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => BillingAddressDto)
  billingAddress?: BillingAddressDto;

  @ApiProperty({
    description: 'Subscription ID (optional)',
    required: false,
    example: 'sub_123456789',
  })
  @IsOptional()
  @IsString()
  subscriptionId?: string;
}
