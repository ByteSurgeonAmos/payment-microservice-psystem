import {
  IsNumber,
  IsString,
  IsEnum,
  IsOptional,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

class CardDetailsDto {
  @IsString()
  number: string;

  @IsString()
  expirationMonth: string;

  @IsString()
  expirationYear: string;

  @IsString()
  securityCode: string;

  @IsString()
  name: string;
}

class BillingAddressDto {
  @IsString()
  addressLine1: string;

  @IsOptional()
  @IsString()
  addressLine2?: string;

  @IsString()
  adminArea2: string;

  @IsString()
  adminArea1: string;

  @IsString()
  postalCode: string;

  @IsString()
  countryCode: string;
}

export class CreatePaymentDto {
  @IsNumber()
  amount: number;

  @IsString()
  currency: string;

  @IsUUID()
  userId: string;

  @IsEnum(['paypal', 'card'])
  paymentMethod: 'paypal' | 'card';

  @IsOptional()
  @ValidateNested()
  @Type(() => CardDetailsDto)
  cardDetails?: CardDetailsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BillingAddressDto)
  billingAddress?: BillingAddressDto;

  @IsOptional()
  @IsString()
  subscriptionId?: string;
}
