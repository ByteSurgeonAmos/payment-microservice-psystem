import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { PaypalModule } from '../paypal/paypal.module';
import { EmailService } from 'src/email/email.service';
import { PaymentsModule } from 'src/payments/payments.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription]),
    PaypalModule,
    PaymentsModule,
  ],
  providers: [SubscriptionsService, EmailService],
  controllers: [SubscriptionsController],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
