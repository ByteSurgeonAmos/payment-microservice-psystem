import { Controller, Post, Body, Get, Param, HttpStatus } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Payment } from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('Payments')
@Controller('api/v1/payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create new payment',
    description:
      'Creates a new payment transaction using either PayPal or credit card',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The payment has been successfully created',
    type: Payment,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid payment data provided',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error occurred while processing payment',
  })
  async createPayment(
    @Body() createPaymentDto: CreatePaymentDto,
  ): Promise<Payment> {
    try {
      return this.paymentsService.createPayment(
        createPaymentDto.amount,
        createPaymentDto.currency,
        createPaymentDto.userId,
        createPaymentDto.paymentMethod,
        createPaymentDto.cardDetails,
        createPaymentDto.billingAddress,
        createPaymentDto.subscriptionId,
      );
    } catch (error) {
      throw new Error(error);
    }
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get payment details',
    description: 'Retrieves the details of a specific payment by ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Payment unique identifier',
    example: 'pay_123456789',
    required: true,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment details retrieved successfully',
    type: Payment,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment with the specified ID was not found',
  })
  async getPayment(@Param('id') id: string): Promise<Payment> {
    return this.paymentsService.getPaymentById(id);
  }

  @Post(':id/capture')
  @ApiOperation({
    summary: 'Capture payment',
    description: 'Captures a previously authorized payment for processing',
  })
  @ApiParam({
    name: 'id',
    description: 'ID of the payment to capture',
    example: 'pay_123456789',
    required: true,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment has been successfully captured',
    type: Payment,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment with the specified ID was not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Payment cannot be captured (wrong status or already captured)',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Error occurred while capturing the payment',
  })
  async capturePayment(@Param('id') id: string): Promise<Payment> {
    return this.paymentsService.capturePayment(id);
  }
}
