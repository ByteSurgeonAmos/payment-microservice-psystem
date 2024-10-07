import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as paypal from '@paypal/checkout-server-sdk';
import { Subscription } from './entities/subscription.entity';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

@Injectable()
export class SubscriptionsService {
  private client: paypal.core.PayPalHttpClient;

  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    private configService: ConfigService,
  ) {
    const environment = new paypal.core.SandboxEnvironment(
      this.configService.get('PAYPAL_CLIENT_ID'),
      this.configService.get('PAYPAL_CLIENT_SECRET'),
    );
    this.client = new paypal.core.PayPalHttpClient(environment);
  }

  async createSubscription(
    createSubscriptionDto: CreateSubscriptionDto,
  ): Promise<Subscription> {
    const startTime = new Date().toISOString();
    const user = await this.getUserDetails(createSubscriptionDto.userId);
    const paypalSubscriptionId = await this.createPayPalSubscription(
      createSubscriptionDto.planId,
      startTime,
      user.email,
      user.firstName,
      user.lastName,
    );

    const subscription = this.subscriptionRepository.create({
      ...createSubscriptionDto,
      status: 'PENDING',
      startDate: new Date(startTime),
      paypalSubscriptionId,
    });

    return this.subscriptionRepository.save(subscription);
  }

  private async createPayPalSubscription(
    planId: string,
    startTime: string,
    emailAddress: string,
    firstName: string,
    lastName: string,
  ): Promise<string> {
    const request = new paypal.subscriptions.SubscriptionsCreateRequest();
    request.prefer('return=representation');

    request.requestBody({
      plan_id: planId,
      start_time: startTime,
      subscriber: {
        name: {
          given_name: firstName,
          surname: lastName,
        },
        email_address: emailAddress,
      },
      application_context: {
        brand_name: this.configService.get('COMPANY_NAME'),
        locale: 'en-US',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        payment_method: {
          payer_selected: 'PAYPAL',
          payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED',
        },
        return_url: this.configService.get('PAYPAL_RETURN_URL'),
        cancel_url: this.configService.get('PAYPAL_CANCEL_URL'),
      },
    });

    const response = await this.client.execute(request);
    return response.result.id;
  }

  async getSubscriptionById(id: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id },
    });
    if (!subscription) {
      throw new NotFoundException(`Subscription with ID "${id}" not found`);
    }
    return subscription;
  }

  async cancelSubscription(id: string): Promise<Subscription> {
    const subscription = await this.getSubscriptionById(id);

    if (subscription.paypalSubscriptionId) {
      await this.cancelPayPalSubscription(
        subscription.paypalSubscriptionId,
        'Cancelled by user',
      );
    }

    subscription.status = 'CANCELLED';
    subscription.endDate = new Date();
    return this.subscriptionRepository.save(subscription);
  }

  private async cancelPayPalSubscription(
    subscriptionId: string,
    reason: string,
  ): Promise<void> {
    const request = new paypal.subscriptions.SubscriptionsCancelRequest(
      subscriptionId,
    );
    request.requestBody({ reason });
    await this.client.execute(request);
  }

  async activateSubscription(id: string): Promise<Subscription> {
    const subscription = await this.getSubscriptionById(id);
    subscription.status = 'ACTIVE';
    return this.subscriptionRepository.save(subscription);
  }

  async getPayPalSubscriptionDetails(
    paypalSubscriptionId: string,
  ): Promise<any> {
    const request = new paypal.subscriptions.SubscriptionsGetRequest(
      paypalSubscriptionId,
    );
    const response = await this.client.execute(request);
    return response.result;
  }

  async updateSubscriptionStatus(
    id: string,
    newStatus: string,
  ): Promise<Subscription> {
    const subscription = await this.getSubscriptionById(id);
    subscription.status = newStatus;
    return this.subscriptionRepository.save(subscription);
  }
  private async getUserDetails(userId: string): Promise<any> {
    // This is just a placeholder
    return {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      locale: 'en-US',
    };
  }
}
