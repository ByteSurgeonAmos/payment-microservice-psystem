import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as paypal from '@paypal/checkout-server-sdk';

@Injectable()
export class PaypalService {
  private client: paypal.core.PayPalHttpClient;

  constructor(private configService: ConfigService) {
    const environment = new paypal.core.SandboxEnvironment(
      this.configService.get('PAYPAL_CLIENT_ID'),
      this.configService.get('PAYPAL_CLIENT_SECRET'),
    );
    this.client = new paypal.core.PayPalHttpClient(environment);
  }

  async createOrder(amount: number, currency: string): Promise<string> {
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer('return=representation');
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: currency,
            value: amount.toString(),
          },
        },
      ],
    });

    const response = await this.client.execute(request);
    return response.result.id;
  }

  async capturePayment(orderId: string): Promise<any> {
    const request = new paypal.orders.OrdersCaptureRequest(orderId);
    const response = await this.client.execute(request);
    return response.result;
  }
}
