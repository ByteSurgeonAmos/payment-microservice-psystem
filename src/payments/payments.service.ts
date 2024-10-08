import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
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

      const request = new paypal.orders.OrdersCreateRequest();
      request.prefer('return=representation');

      const requestBody: any = {
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: currency,
              value: amount.toString(),
            },
          },
        ],
      };

      if (paymentMethod === 'card' && cardDetails && billingAddress) {
        requestBody.payment_source = {
          card: {
            number: cardDetails.number,
            expiry: `${cardDetails.expirationMonth}/${cardDetails.expirationYear}`,
            name: cardDetails.name,
            security_code: cardDetails.securityCode,
            billing_address: {
              address_line_1: billingAddress.addressLine1,
              address_line_2: billingAddress.addressLine2,
              admin_area_2: billingAddress.adminArea2,
              admin_area_1: billingAddress.adminArea1,
              postal_code: billingAddress.postalCode,
              country_code: billingAddress.countryCode,
            },
          },
        };
      }

      request.requestBody(requestBody);

      const paypalOrderId = await this.paypalService.createOrder(request);

      const payment = this.paymentRepository.create({
        amount,
        currency,
        status: 'PENDING',
        paypalOrderId,
        userId,
        subscriptionId,
        paymentMethod,
      });
      const savedPayment = await this.paymentRepository.save(payment);
      this.logger.log(`Payment created successfully: ${savedPayment.id}`);
      return savedPayment;
    } catch (error) {
      this.logger.error(
        `Failed to create payment: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to create payment');
    }
  }

  async getPaymentById(id: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({ where: { id } });
    if (!payment) {
      throw new NotFoundException(`Payment with ID "${id}" not found`);
    }
    return payment;
  }

  async capturePayment(id: string): Promise<Payment> {
    const payment = await this.getPaymentById(id);
    const captureResult = await this.paypalService.capturePayment(
      payment.paypalOrderId,
    );

    payment.status =
      captureResult.status === 'COMPLETED' ? 'COMPLETED' : 'FAILED';
    return this.paymentRepository.save(payment);
  }
}
