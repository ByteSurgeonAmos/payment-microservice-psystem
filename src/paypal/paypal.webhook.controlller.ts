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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiBody,
} from '@nestjs/swagger';
import { PayPalWebhookHeadersDto } from './dto/paypal-webhook-headers.dto';

@ApiTags('Webhooks')
@Controller('api/v1/webhooks')
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
  @ApiOperation({
    summary: 'Handle PayPal webhook',
    description:
      'Processes incoming PayPal webhook notifications for subscription events',
  })
  @ApiHeader({
    name: 'paypal-auth-algo',
    description: 'PayPal authentication algorithm',
    required: true,
    example: 'SHA256withRSA',
  })
  @ApiHeader({
    name: 'paypal-cert-url',
    description: 'PayPal certificate URL',
    required: true,
  })
  @ApiHeader({
    name: 'paypal-transmission-id',
    description: 'PayPal transmission ID',
    required: true,
  })
  @ApiHeader({
    name: 'paypal-transmission-sig',
    description: 'PayPal transmission signature',
    required: true,
  })
  @ApiHeader({
    name: 'paypal-transmission-time',
    description: 'PayPal transmission timestamp',
    required: true,
  })
  @ApiBody({
    description: 'PayPal webhook event payload',
    schema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Webhook event ID',
          example: 'WH-82J284728P892214R-5WK24813RC056154S',
        },
        event_type: {
          type: 'string',
          description: 'Type of webhook event',
          example: 'BILLING.SUBSCRIPTION.ACTIVATED',
        },
        resource: {
          type: 'object',
          description: 'Event resource details',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Webhook processed successfully',
    schema: {
      type: 'object',
      properties: {
        received: {
          type: 'boolean',
          example: true,
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid webhook signature or payload',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Error processing webhook',
  })
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

  /**
   * Verifies the PayPal webhook signature
   * @param webhookBody The webhook event payload
   * @param headers The webhook request headers
   * @param webhookId The PayPal webhook ID from configuration
   * @returns The verification status ('SUCCESS' or 'FAILURE')
   */
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
