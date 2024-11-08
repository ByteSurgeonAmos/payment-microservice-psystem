import { Injectable, Logger } from '@nestjs/common';
import * as paypal from '@paypal/checkout-server-sdk';
import { v4 as uuidv4 } from 'uuid';

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
      const requestId = uuidv4();
      request.headers = {
        ...request.headers,
        'PayPal-Request-Id': requestId,
        prefer: 'return=representation',
      };

      if (request.requestBody.payment_source?.card) {
        const { card } = request.requestBody.payment_source;
        request.requestBody = {
          intent: 'CAPTURE',
          purchase_units: [
            {
              amount: {
                currency_code:
                  request.requestBody.purchase_units[0].amount.currency_code,
                value: request.requestBody.purchase_units[0].amount.value,
              },
            },
          ],
          payment_source: {
            card: {
              number: card.number,
              expiry: card.expiry,
              name: card.name,
              security_code: card.security_code,
              billing_address: card.billing_address,
            },
          },
        };
      }

      this.logger.log('Executing PayPal request with ID: ' + requestId);

      const response = await this.client.execute(request);
      this.logger.log(
        `PayPal order created successfully: ${response.result.id}`,
      );
      return response.result.id;
    } catch (error) {
      this.logger.error('Error creating PayPal order:', {
        error: error.message,
        details: error.details || [],
        name: error.name,
        debug_id: error.debug_id,
      });
      throw new Error(`PayPal order creation failed: ${JSON.stringify(error)}`);
    }
  }

  async capturePayment(orderId: string): Promise<any> {
    const request = new paypal.orders.OrdersCaptureRequest(orderId);
    const requestId = uuidv4();
    request.headers = {
      'PayPal-Request-Id': requestId,
    };
    request.requestBody({});

    try {
      const response = await this.client.execute(request);
      return response.result;
    } catch (error) {
      this.logger.error('Error capturing PayPal payment:', error);
      throw new Error(`PayPal payment capture failed: ${error.message}`);
    }
  }
}
