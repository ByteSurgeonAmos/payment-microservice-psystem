import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { ConfigService } from '@nestjs/config';
import * as paypal from '@paypal/checkout-server-sdk';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);
  private readonly paypalClient: paypal.core.PayPalHttpClient;

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly configService: ConfigService,
  ) {
    const clientId = this.configService.get<string>('PAYPAL_CLIENT_ID');
    const clientSecret = this.configService.get<string>('PAYPAL_CLIENT_SECRET');
    const environment = new paypal.core.SandboxEnvironment(
      clientId,
      clientSecret,
    );
    this.paypalClient = new paypal.core.PayPalHttpClient(environment);
  }

  @Post('paypal')
  @HttpCode(200)
  async handlePayPalWebhook(
    @Body() webhookBody: any,
    @Headers('paypal-auth-algo') authAlgo: string,
    @Headers('paypal-cert-url') certUrl: string,
    @Headers('paypal-transmission-id') transmissionId: string,
    @Headers('paypal-transmission-sig') transmissionSig: string,
    @Headers('paypal-transmission-time') transmissionTime: string,
  ) {
    const webhookId = this.configService.get<string>('PAYPAL_WEBHOOK_ID');

    try {
      const verificationStatus = await this.verifyWebhookSignature(
        webhookBody,
        {
          auth_algo: authAlgo,
          cert_url: certUrl,
          transmission_id: transmissionId,
          transmission_sig: transmissionSig,
          transmission_time: transmissionTime,
        },
        webhookId,
      );

      if (verificationStatus !== 'SUCCESS') {
        this.logger.warn(
          `Webhook signature verification failed: ${verificationStatus}`,
        );
        throw new HttpException(
          'Webhook signature verification failed',
          HttpStatus.BAD_REQUEST,
        );
      }

      await this.subscriptionsService.handlePayPalWebhook(webhookBody);
      return { received: true };
    } catch (error) {
      this.logger.error(
        `Error processing webhook: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error processing webhook',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async verifyWebhookSignature(
    webhookBody: any,
    headers: {
      auth_algo: string;
      cert_url: string;
      transmission_id: string;
      transmission_sig: string;
      transmission_time: string;
    },
    webhookId: string,
  ): Promise<string> {
    try {
      const verifyRequest =
        new paypal.notifications.VerifyWebhookSignatureRequest();
      verifyRequest.requestBody({
        auth_algo: headers.auth_algo,
        cert_url: headers.cert_url,
        transmission_id: headers.transmission_id,
        transmission_sig: headers.transmission_sig,
        transmission_time: headers.transmission_time,
        webhook_id: webhookId,
        webhook_event: webhookBody,
      });

      const response = await this.paypalClient.execute(verifyRequest);
      return response.result.verification_status;
    } catch (error) {
      this.logger.error(
        `Error verifying webhook signature: ${error.message}`,
        error.stack,
      );
      return 'FAILURE';
    }
  }
}
