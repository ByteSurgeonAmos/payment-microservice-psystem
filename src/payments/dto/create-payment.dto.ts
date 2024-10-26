import {
  IsNumber,
  IsString,
  IsEnum,
  IsOptional,
  ValidateNested,
  IsUUID,
  Min,
  MaxLength,
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
  @Min(0)
  amount: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'USD',
    enum: ['USD', 'EUR', 'GBP'],
  })
  @IsString()
  @MaxLength(3)
  currency: string;

  @ApiProperty({
    description: 'User ID (must be a valid UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: 'Payment method',
    enum: ['paypal', 'card'],
    example: 'paypal',
  })
  @IsEnum(['paypal', 'card'])
  paymentMethod: 'paypal' | 'card';

  @ApiProperty({
    description: 'Card details (required if payment method is card)',
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CardDetailsDto)
  cardDetails?: CardDetailsDto;

  @ApiProperty({
    description: 'Billing address (required if payment method is card)',
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => BillingAddressDto)
  billingAddress?: BillingAddressDto;

  @ApiProperty({
    description: 'Subscription ID',
    required: false,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  subscriptionId?: string;
}
