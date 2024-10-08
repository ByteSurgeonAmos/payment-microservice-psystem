import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Payment } from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  async createPayment(
    @Body() createPaymentDto: CreatePaymentDto,
  ): Promise<Payment> {
    return this.paymentsService.createPayment(
      createPaymentDto.amount,
      createPaymentDto.currency,
      createPaymentDto.userId,
      createPaymentDto.paymentMethod,
      createPaymentDto.cardDetails,
      createPaymentDto.billingAddress,
      createPaymentDto.subscriptionId,
    );
  }

  @Get(':id')
  async getPayment(@Param('id') id: string): Promise<Payment> {
    return this.paymentsService.getPaymentById(id);
  }

  @Post(':id/capture')
  async capturePayment(@Param('id') id: string): Promise<Payment> {
    return this.paymentsService.capturePayment(id);
  }
}
