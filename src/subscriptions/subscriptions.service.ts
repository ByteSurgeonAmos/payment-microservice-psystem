import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as paypal from '@paypal/checkout-server-sdk';
import { Subscription } from './entities/subscription.entity';
import { Payment } from '../payments/entities/payment.entity';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { EmailService } from '../email/email.service';

enum SubscriptionStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  SUSPENDED = 'SUSPENDED',
  EXPIRED = 'EXPIRED',
}

interface UserDetails {
  email: string;
  firstName: string;
  lastName: string;
}

@Injectable()
export class SubscriptionsService {
  private readonly client: paypal.core.PayPalHttpClient;
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {
    const environment = new paypal.core.SandboxEnvironment(
      this.configService.get<string>('PAYPAL_CLIENT_ID'),
      this.configService.get<string>('PAYPAL_CLIENT_SECRET'),
    );
    this.client = new paypal.core.PayPalHttpClient(environment);
  }

  async createSubscription(
    createSubscriptionDto: CreateSubscriptionDto,
  ): Promise<{ subscription: Subscription; initialPaymentOrderId?: string }> {
    const userDetails = await this.getUserDetails(createSubscriptionDto.userId);
    let paypalSubscriptionId: string | null = null;
    let initialPaymentOrderId: string | null = null;

    try {
      // Create PayPal subscription
      paypalSubscriptionId = await this.createPayPalSubscription(
        createSubscriptionDto.planId,
        userDetails.email,
        userDetails.firstName,
        userDetails.lastName,
      );

      const subscription = this.subscriptionRepository.create({
        ...createSubscriptionDto,
        status: SubscriptionStatus.PENDING,
        startDate: new Date(),
        paypalSubscriptionId,
      });

      const savedSubscription =
        await this.subscriptionRepository.save(subscription);

      // Handle initial payment if required
      if (createSubscriptionDto.initialPaymentAmount) {
        initialPaymentOrderId = await this.createPayPalOrder(
          createSubscriptionDto.initialPaymentAmount,
          createSubscriptionDto.currency,
        );

        // Save the initial payment details
        await this.paymentRepository.save({
          subscriptionId: savedSubscription.id,
          amount: createSubscriptionDto.initialPaymentAmount,
          currency: createSubscriptionDto.currency,
          status: 'PENDING',
          paypalOrderId: initialPaymentOrderId,
        });
      }

      await this.emailService.sendSubscriptionCreatedNotification(
        userDetails.email,
      );

      return {
        subscription: savedSubscription,
        initialPaymentOrderId: initialPaymentOrderId || undefined,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create subscription: ${error.message}`,
        error.stack,
      );
      if (paypalSubscriptionId) {
        await this.cancelPayPalSubscription(
          paypalSubscriptionId,
          'Failed to create subscription in local database',
        );
      }

      await this.emailService.sendSubscriptionFailureNotification(
        userDetails.email,
        error.message,
      );
      throw new Error('Failed to create subscription');
    }
  }

  private async createPayPalSubscription(
    planId: string,
    emailAddress: string,
    firstName: string,
    lastName: string,
  ): Promise<string> {
    const request = new paypal.subscriptions.SubscriptionsCreateRequest();
    request.prefer('return=representation');

    request.requestBody({
      plan_id: planId,
      subscriber: {
        name: { given_name: firstName, surname: lastName },
        email_address: emailAddress,
      },
      application_context: {
        brand_name: this.configService.get<string>('COMPANY_NAME'),
        locale: 'en-US',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        payment_method: {
          payer_selected: 'PAYPAL',
          payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED',
        },
        return_url: this.configService.get<string>('PAYPAL_RETURN_URL'),
        cancel_url: this.configService.get<string>('PAYPAL_CANCEL_URL'),
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
    const userDetails = await this.getUserDetails(subscription.userId);

    if (subscription.paypalSubscriptionId) {
      await this.cancelPayPalSubscription(
        subscription.paypalSubscriptionId,
        'Cancelled by user',
      );
    }

    const updatedSubscription = await this.updateSubscriptionStatus(
      id,
      SubscriptionStatus.CANCELLED,
    );
    await this.emailService.sendSubscriptionCancelledNotification(
      userDetails.email,
    );
    return updatedSubscription;
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

  async updateSubscriptionStatus(
    id: string,
    newStatus: SubscriptionStatus,
  ): Promise<Subscription> {
    const subscription = await this.getSubscriptionById(id);
    subscription.status = newStatus;
    if (newStatus === SubscriptionStatus.CANCELLED) {
      subscription.endDate = new Date();
    }
    return this.subscriptionRepository.save(subscription);
  }

  private async getUserDetails(userId: string): Promise<UserDetails> {
    // In a real microservice architecture, this would be an RPC call to a user service
    // For now, we'll return dummy data
    this.logger.log(`Fetching user details for userId: ${userId}`);
    return {
      email: `user_${userId}@example.com`,
      firstName: 'John',
      lastName: 'Doe',
    };
  }

  async handlePayPalWebhook(event: any): Promise<void> {
    this.logger.log(`Received PayPal webhook event: ${event.event_type}`);

    const handlers: { [key: string]: (event: any) => Promise<void> } = {
      'BILLING.SUBSCRIPTION.CREATED': this.handleSubscriptionCreated.bind(this),
      'BILLING.SUBSCRIPTION.ACTIVATED':
        this.handleSubscriptionActivated.bind(this),
      'BILLING.SUBSCRIPTION.UPDATED': this.handleSubscriptionUpdated.bind(this),
      'BILLING.SUBSCRIPTION.CANCELLED':
        this.handleSubscriptionCancelled.bind(this),
      'BILLING.SUBSCRIPTION.SUSPENDED':
        this.handleSubscriptionSuspended.bind(this),
      'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
        this.handlePaymentFailed.bind(this),
      'PAYMENT.SALE.COMPLETED': this.handlePaymentCompleted.bind(this),
    };

    const handler = handlers[event.event_type];
    if (handler) {
      await handler(event);
    } else {
      this.logger.warn(
        `Unhandled PayPal webhook event type: ${event.event_type}`,
      );
    }
  }

  private async handleSubscriptionCreated(event: any): Promise<void> {
    const paypalSubscriptionId = event.resource.id;
    const subscription = await this.subscriptionRepository.findOne({
      where: { paypalSubscriptionId },
    });

    if (subscription) {
      subscription.status = SubscriptionStatus.PENDING;
      await this.subscriptionRepository.save(subscription);
      const userDetails = await this.getUserDetails(subscription.userId);
      await this.emailService.sendSubscriptionCreatedNotification(
        userDetails.email,
      );
    } else {
      this.logger.warn(
        `Received CREATED event for unknown subscription: ${paypalSubscriptionId}`,
      );
    }
  }

  private async handleSubscriptionActivated(event: any): Promise<void> {
    const paypalSubscriptionId = event.resource.id;
    const subscription = await this.subscriptionRepository.findOne({
      where: { paypalSubscriptionId },
    });

    if (subscription) {
      subscription.status = SubscriptionStatus.ACTIVE;
      await this.subscriptionRepository.save(subscription);
      const userDetails = await this.getUserDetails(subscription.userId);
      await this.emailService.sendSubscriptionActivatedNotification(
        userDetails.email,
      );
    } else {
      this.logger.warn(
        `Received ACTIVATED event for unknown subscription: ${paypalSubscriptionId}`,
      );
    }
  }

  private async handleSubscriptionUpdated(event: any): Promise<void> {
    const paypalSubscriptionId = event.resource.id;
    const subscription = await this.subscriptionRepository.findOne({
      where: { paypalSubscriptionId },
    });

    if (subscription) {
      // Update relevant fields based on the event data
      await this.subscriptionRepository.save(subscription);
      const userDetails = await this.getUserDetails(subscription.userId);
      await this.emailService.sendSubscriptionUpdatedNotification(
        userDetails.email,
      );
    } else {
      this.logger.warn(
        `Received UPDATED event for unknown subscription: ${paypalSubscriptionId}`,
      );
    }
  }

  private async handleSubscriptionCancelled(event: any): Promise<void> {
    const paypalSubscriptionId = event.resource.id;
    const subscription = await this.subscriptionRepository.findOne({
      where: { paypalSubscriptionId },
    });

    if (subscription) {
      subscription.status = SubscriptionStatus.CANCELLED;
      subscription.endDate = new Date();
      await this.subscriptionRepository.save(subscription);
      const userDetails = await this.getUserDetails(subscription.userId);
      await this.emailService.sendSubscriptionCancelledNotification(
        userDetails.email,
      );
    } else {
      this.logger.warn(
        `Received CANCELLED event for unknown subscription: ${paypalSubscriptionId}`,
      );
    }
  }

  private async handleSubscriptionSuspended(event: any): Promise<void> {
    const paypalSubscriptionId = event.resource.id;
    const subscription = await this.subscriptionRepository.findOne({
      where: { paypalSubscriptionId },
    });

    if (subscription) {
      subscription.status = SubscriptionStatus.SUSPENDED;
      await this.subscriptionRepository.save(subscription);
      const userDetails = await this.getUserDetails(subscription.userId);
      await this.emailService.sendSubscriptionSuspendedNotification(
        userDetails.email,
      );
    } else {
      this.logger.warn(
        `Received SUSPENDED event for unknown subscription: ${paypalSubscriptionId}`,
      );
    }
  }

  private async handlePaymentFailed(event: any): Promise<void> {
    const paypalSubscriptionId = event.resource.id;
    const subscription = await this.subscriptionRepository.findOne({
      where: { paypalSubscriptionId },
    });

    if (subscription) {
      await this.paymentRepository.save({
        subscriptionId: subscription.id,
        amount: event.resource.amount.value,
        currency: event.resource.amount.currency_code,
        status: 'FAILED',
        paypalTransactionId: event.resource.id,
        failureReason: event.resource.status_reason,
      });

      const userDetails = await this.getUserDetails(subscription.userId);
      await this.emailService.sendPaymentFailedNotification(userDetails.email);
    } else {
      this.logger.warn(
        `Received PAYMENT.FAILED event for unknown subscription: ${paypalSubscriptionId}`,
      );
    }
  }

  private async handlePaymentCompleted(event: any): Promise<void> {
    const paypalSubscriptionId = event.resource.billing_agreement_id;
    const subscription = await this.subscriptionRepository.findOne({
      where: { paypalSubscriptionId },
    });

    if (subscription) {
      await this.paymentRepository.save({
        subscriptionId: subscription.id,
        amount: event.resource.amount.total,
        currency: event.resource.amount.currency,
        status: 'COMPLETED',
        paypalTransactionId: event.resource.id,
        paymentDate: new Date(event.resource.create_time),
      });

      subscription.lastPaymentDate = new Date(event.resource.create_time);
      await this.subscriptionRepository.save(subscription);

      const userDetails = await this.getUserDetails(subscription.userId);
      await this.emailService.sendPaymentCompletedNotification(
        userDetails.email,
      );
    } else {
      this.logger.warn(
        `Received PAYMENT.COMPLETED event for unknown subscription: ${paypalSubscriptionId}`,
      );
    }
  }
  private async createPayPalOrder(
    amount: number,
    currency: string,
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
  ): Promise<string> {
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

    if (cardDetails && billingAddress) {
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

    const response = await this.client.execute(request);
    return response.result.id;
  }
}
