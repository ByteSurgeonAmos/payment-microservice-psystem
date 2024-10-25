import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class PayPalWebhookHeadersDto {
  @ApiProperty({
    description: 'PayPal authentication algorithm',
    example: 'SHA256withRSA',
  })
  @IsString()
  @IsNotEmpty()
  'paypal-auth-algo': string;

  @ApiProperty({
    description: 'PayPal certificate URL',
    example:
      'https://api.paypal.com/v1/notifications/certs/CERT-360caa42-fca2a594-1d93a270',
  })
  @IsString()
  @IsNotEmpty()
  'paypal-cert-url': string;

  @ApiProperty({
    description: 'PayPal transmission ID',
    example: '8f3cf162-40d6-11ee-9c30-6b18d8b5d14d',
  })
  @IsString()
  @IsNotEmpty()
  'paypal-transmission-id': string;

  @ApiProperty({
    description: 'PayPal transmission signature',
    example: 'kR9kR9kR9kR9kR9kR9kR9kR9kR9kR9kR9kR9kR9kR9kR9kR9==',
  })
  @IsString()
  @IsNotEmpty()
  'paypal-transmission-sig': string;

  @ApiProperty({
    description: 'PayPal transmission timestamp',
    example: '2024-10-25T12:34:56Z',
  })
  @IsString()
  @IsNotEmpty()
  'paypal-transmission-time': string;
}
