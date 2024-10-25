import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  HttpStatus,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { Subscription } from './entities/subscription.entity';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('Subscriptions')
@Controller('api/v1/subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create subscription',
    description: 'Creates a new subscription with initial payment setup',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Subscription created successfully',
    schema: {
      properties: {
        subscription: { $ref: '#/components/schemas/Subscription' },
        initialPaymentOrderId: {
          type: 'string',
          description: 'ID of the initial payment order',
          example: 'ord_123456789',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid subscription data provided',
  })
  async createSubscription(
    @Body() createSubscriptionDto: CreateSubscriptionDto,
  ) {
    const result = await this.subscriptionsService.createSubscription(
      createSubscriptionDto,
    );

    return {
      subscription: result.subscription,
      initialPaymentOrderId: result.initialPaymentOrderId,
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get subscription',
    description: 'Retrieves subscription details by ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Subscription ID',
    example: 'sub_123456789',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Subscription details retrieved successfully',
    type: Subscription,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Subscription not found',
  })
  async getSubscription(@Param('id') id: string): Promise<Subscription> {
    return this.subscriptionsService.getSubscriptionById(id);
  }

  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'Cancel subscription',
    description: 'Cancels an active subscription',
  })
  @ApiParam({
    name: 'id',
    description: 'ID of the subscription to cancel',
    example: 'sub_123456789',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Subscription cancelled successfully',
    type: Subscription,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Subscription not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Subscription cannot be cancelled (wrong status)',
  })
  async cancelSubscription(@Param('id') id: string): Promise<Subscription> {
    return this.subscriptionsService.cancelSubscription(id);
  }
}
