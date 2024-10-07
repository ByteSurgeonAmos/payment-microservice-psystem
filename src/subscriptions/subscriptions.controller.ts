import { Controller, Post, Body, Get, Param, Patch } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { Subscription } from './entities/subscription.entity';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  async createSubscription(
    @Body() createSubscriptionDto: CreateSubscriptionDto,
  ): Promise<Subscription> {
    return this.subscriptionsService.createSubscription(createSubscriptionDto);
  }

  @Get(':id')
  async getSubscription(@Param('id') id: string): Promise<Subscription> {
    return this.subscriptionsService.getSubscriptionById(id);
  }

  @Patch(':id/cancel')
  async cancelSubscription(@Param('id') id: string): Promise<Subscription> {
    return this.subscriptionsService.cancelSubscription(id);
  }
}
