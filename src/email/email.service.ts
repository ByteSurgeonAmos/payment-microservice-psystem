import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: true,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  private async sendEmail(
    to: string,
    subject: string,
    text: string,
  ): Promise<void> {
    const mailOptions = {
      from: this.configService.get<string>('SMTP_FROM'),
      to,
      subject,
      text,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Sent email notification to ${to}: ${subject}`);
    } catch (error) {
      this.logger.error(
        `Failed to send email notification to ${to}: ${error.message}`,
      );
    }
  }

  async sendSubscriptionCreatedNotification(email: string): Promise<void> {
    await this.sendEmail(
      email,
      'Subscription Created',
      'Your subscription has been successfully created. It will be activated once the initial payment is processed.',
    );
  }

  async sendSubscriptionActivatedNotification(email: string): Promise<void> {
    await this.sendEmail(
      email,
      'Subscription Activated',
      'Your subscription has been activated. You now have access to all the features included in your subscription plan.',
    );
  }

  async sendSubscriptionUpdatedNotification(email: string): Promise<void> {
    await this.sendEmail(
      email,
      'Subscription Updated',
      'Your subscription details have been updated. Please log in to your account to view the changes.',
    );
  }

  async sendSubscriptionCancelledNotification(email: string): Promise<void> {
    await this.sendEmail(
      email,
      'Subscription Cancelled',
      "Your subscription has been cancelled. We're sorry to see you go. If you have any feedback, please let us know.",
    );
  }

  async sendSubscriptionSuspendedNotification(email: string): Promise<void> {
    await this.sendEmail(
      email,
      'Subscription Suspended',
      'Your subscription has been suspended. This may be due to a payment issue. Please check your payment method and contact support if you need assistance.',
    );
  }

  async sendPaymentFailedNotification(email: string): Promise<void> {
    await this.sendEmail(
      email,
      'Payment Failed',
      'We were unable to process your latest payment. Please update your payment method to avoid interruption of your service. If you need assistance, please contact our support team.',
    );
  }

  async sendPaymentCompletedNotification(email: string): Promise<void> {
    await this.sendEmail(
      email,
      'Payment Successful',
      'Your latest payment has been successfully processed. Thank you for your continued subscription.',
    );
  }

  async sendSubscriptionFailureNotification(
    email: string,
    errorMessage: string,
  ): Promise<void> {
    await this.sendEmail(
      email,
      'Subscription Creation Failed',
      `We're sorry, but we encountered an error while trying to create your subscription. The error was: ${errorMessage}. Please contact our support team for assistance.`,
    );
  }
}
