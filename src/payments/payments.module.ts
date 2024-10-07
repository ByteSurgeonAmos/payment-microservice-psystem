import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaypalModule } from '../paypal/paypal.module';

@Module({
  imports: [TypeOrmModule.forFeature([Payment]), PaypalModule],
  providers: [PaymentsService],
  controllers: [PaymentsController],
  exports: [PaymentsService, TypeOrmModule],
})
export class PaymentsModule {}
