import { Injectable, Logger } from '@nestjs/common';
import * as paypal from '@paypal/checkout-server-sdk';

@Injectable()
export class PaypalService {
  private client: paypal.core.PayPalHttpClient;
  private readonly logger = new Logger(PaypalService.name);

  constructor() {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const environment = new paypal.core.LiveEnvironment(clientId, clientSecret);
    this.client = new paypal.core.PayPalHttpClient(environment);
  }

  async createOrder(
    request: paypal.orders.OrdersCreateRequest,
  ): Promise<string> {
    this.logger.log('Attempting to create PayPal order...');
    try {
      this.logger.log('Executing PayPal request...');
      const response = await this.client.execute(request);
      this.logger.log(
        `PayPal order created successfully: ${response.result.id}`,
      );
      return response.result.id;
    } catch (error) {
      this.logger.error('Error creating PayPal order:', error);
      if (error.response) {
        this.logger.error(
          'PayPal API response:',
          JSON.stringify(error.response.data, null, 2),
        );
      }
      throw new Error(`PayPal order creation failed: ${error.message}`);
    }
  }

  async capturePayment(orderId: string): Promise<any> {
    const request = new paypal.orders.OrdersCaptureRequest(orderId);
    request.requestBody({});

    try {
      const response = await this.client.execute(request);
      return response.result;
    } catch (error) {
      this.logger.error('Error capturing PayPal payment:', error);
      if (error.response) {
        this.logger.error(
          'PayPal API response:',
          JSON.stringify(error.response.data, null, 2),
        );
      }
      throw new Error(`PayPal payment capture failed: ${error.message}`);
    }
  }
}
