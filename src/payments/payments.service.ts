import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { PaypalService } from '../paypal/paypal.service';
import * as paypal from '@paypal/checkout-server-sdk';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    private paypalService: PaypalService,
  ) {}

  private formatExpiryDate(month: string, year: string): string {
    // Ensure month is two digits
    const formattedMonth = month.padStart(2, '0');

    // If year is provided as YY, convert to YYYY
    const formattedYear = year.length === 2 ? `20${year}` : year;

    // Return in YYYY-MM format (PayPal's required format)
    return `${formattedYear}-${formattedMonth}`;
  }

  async createPayment(
    amount: number,
    currency: string,
    userId: string,
    paymentMethod: 'paypal' | 'card',
    cardDetails?: {
      number: string;
      expirationMonth: string;
      expirationYear: string;
      securityCode: string;
      name: string;
    },
    billingAddress?: {
      addressLine1: string;
      addressLine2?: string;
      adminArea2: string;
      adminArea1: string;
      postalCode: string;
      countryCode: string;
    },
    subscriptionId?: string,
  ): Promise<Payment> {
    try {
      this.logger.log(
        `Creating payment: amount=${amount}, currency=${currency}, userId=${userId}, paymentMethod=${paymentMethod}, subscriptionId=${subscriptionId || 'N/A'}`,
      );

      if (paymentMethod === 'card') {
        if (!cardDetails) {
          throw new BadRequestException(
            'Card details are required for card payments',
          );
        }
        if (!billingAddress) {
          throw new BadRequestException(
            'Billing address is required for card payments',
          );
        }
      }

      const request = new paypal.orders.OrdersCreateRequest();
      request.prefer('return=representation');

      const requestBody: any = {
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: currency,
              value: amount.toFixed(2),
            },
          },
        ],
      };

      if (paymentMethod === 'card') {
        const expiry = this.formatExpiryDate(
          cardDetails.expirationMonth,
          cardDetails.expirationYear,
        );

        requestBody.payment_source = {
          card: {
            number: cardDetails.number,
            expiry,
            name: cardDetails.name,
            security_code: cardDetails.securityCode,
            billing_address: {
              address_line_1: billingAddress.addressLine1,
              ...(billingAddress.addressLine2 && {
                address_line_2: billingAddress.addressLine2,
              }),
              admin_area_2: billingAddress.adminArea2,
              admin_area_1: billingAddress.adminArea1,
              postal_code: billingAddress.postalCode,
              country_code: billingAddress.countryCode,
            },
          },
        };

        this.logger.debug('Card payment request body:', {
          ...requestBody,
          payment_source: {
            ...requestBody.payment_source,
            card: {
              ...requestBody.payment_source.card,
              number: '****',
              security_code: '***',
            },
          },
        });
      }

      request.requestBody(requestBody);

      let paypalOrderId;
      try {
        paypalOrderId = await this.paypalService.createOrder(request);
      } catch (paypalError) {
        this.logger.error('PayPal Error:', paypalError);

        // Try to parse PayPal's error response
        try {
          let errorMessage = paypalError.message;
          if (
            typeof errorMessage === 'string' &&
            errorMessage.startsWith('{')
          ) {
            const errorDetails = JSON.parse(errorMessage);
            if (errorDetails.details && errorDetails.details.length > 0) {
              const descriptions = errorDetails.details
                .map((detail) => `${detail.issue}: ${detail.description}`)
                .join('; ');
              throw new BadRequestException(
                `PayPal validation error: ${descriptions}`,
              );
            }
          }
        } catch (parseError) {
          // If parsing fails, use the original error
          throw new BadRequestException(paypalError.message);
        }

        throw new InternalServerErrorException('Payment processing failed');
      }

      const payment = this.paymentRepository.create({
        amount,
        currency,
        status: 'PENDING',
        paypalOrderId,
        userId,
        subscriptionId,
        paymentMethod,
      });

      try {
        const savedPayment = await this.paymentRepository.save(payment);
        this.logger.log(`Payment created successfully: ${savedPayment.id}`);
        return savedPayment;
      } catch (dbError) {
        this.logger.error('Database Error:', dbError);
        throw new InternalServerErrorException('Failed to save payment record');
      }
    } catch (error) {
      if (error.status) {
        throw error;
      }

      this.logger.error(
        `Failed to create payment: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to create payment');
    }
  }

  async getPaymentById(id: string): Promise<Payment> {
    try {
      const payment = await this.paymentRepository.findOne({ where: { id } });
      if (!payment) {
        throw new NotFoundException(`Payment with ID "${id}" not found`);
      }
      return payment;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error fetching payment ${id}:`, error);
      throw new InternalServerErrorException('Failed to retrieve payment');
    }
  }

  async capturePayment(id: string): Promise<Payment> {
    try {
      const payment = await this.getPaymentById(id);

      if (payment.status === 'COMPLETED') {
        throw new BadRequestException('Payment has already been captured');
      }

      if (payment.status === 'FAILED') {
        throw new BadRequestException('Cannot capture a failed payment');
      }

      let captureResult;
      try {
        captureResult = await this.paypalService.capturePayment(
          payment.paypalOrderId,
        );
      } catch (paypalError) {
        this.logger.error('PayPal Capture Error:', paypalError);

        // Try to parse PayPal's error response
        try {
          let errorMessage = paypalError.message;
          if (
            typeof errorMessage === 'string' &&
            errorMessage.startsWith('{')
          ) {
            const errorDetails = JSON.parse(errorMessage);
            if (errorDetails.details && errorDetails.details.length > 0) {
              const descriptions = errorDetails.details
                .map((detail) => `${detail.issue}: ${detail.description}`)
                .join('; ');
              throw new BadRequestException(
                `PayPal capture error: ${descriptions}`,
              );
            }
          }
        } catch (parseError) {
          // If parsing fails, use the original error
          throw new BadRequestException(paypalError.message);
        }

        throw new InternalServerErrorException('Payment capture failed');
      }

      payment.status =
        captureResult.status === 'COMPLETED' ? 'COMPLETED' : 'FAILED';

      try {
        const updatedPayment = await this.paymentRepository.save(payment);
        this.logger.log(`Payment ${id} captured successfully`);
        return updatedPayment;
      } catch (dbError) {
        this.logger.error('Database Error:', dbError);
        throw new InternalServerErrorException(
          'Failed to update payment status',
        );
      }
    } catch (error) {
      if (error.status) {
        throw error;
      }
      this.logger.error(
        `Failed to capture payment ${id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to capture payment');
    }
  }
}
