import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { PaypalService } from '../paypal/paypal.service';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    private paypalService: PaypalService,
  ) {}

  async createPayment(amount: number, currency: string): Promise<Payment> {
    const paypalOrderId = await this.paypalService.createOrder(
      amount,
      currency,
    );

    const payment = this.paymentRepository.create({
      amount,
      currency,
      status: 'PENDING',
      paypalOrderId,
    });

    return this.paymentRepository.save(payment);
  }

  async getPaymentById(id: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({ where: { id } });
    if (!payment) {
      throw new NotFoundException(`Payment with ID "${id}" not found`);
    }
    return payment;
  }

  async capturePayment(id: string): Promise<Payment> {
    const payment = await this.getPaymentById(id);
    const captureResult = await this.paypalService.capturePayment(
      payment.paypalOrderId,
    );

    payment.status =
      captureResult.status === 'COMPLETED' ? 'COMPLETED' : 'FAILED';
    return this.paymentRepository.save(payment);
  }
}
