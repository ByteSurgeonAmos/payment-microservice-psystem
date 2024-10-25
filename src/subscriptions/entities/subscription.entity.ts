import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionStatus } from '../enums/subscription-status.enum';

@Entity()
export class Subscription {
  @ApiProperty({
    description: 'Unique identifier of the subscription',
    example: 'sub_123456789',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'User ID who owns the subscription',
    example: 'usr_123456789',
  })
  @Column()
  userId: string;

  @ApiProperty({
    description: 'Plan ID associated with the subscription',
    example: 'plan_premium_monthly',
  })
  @Column()
  planId: string;

  @ApiProperty({
    description: 'Current status of the subscription',
    enum: SubscriptionStatus,
    example: SubscriptionStatus.ACTIVE,
  })
  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.PENDING,
  })
  status: SubscriptionStatus;

  @ApiProperty({
    description: 'PayPal subscription ID for recurring payments',
    example: 'I-BW452GLLEP1G',
    required: false,
  })
  @Column({ nullable: true })
  paypalSubscriptionId: string;

  @ApiProperty({
    description: 'Date when the subscription begins',
    example: '2024-10-25T00:00:00Z',
  })
  @Column()
  startDate: Date;

  @ApiProperty({
    description: 'Date when the subscription ends (if cancelled/expired)',
    example: '2025-10-25T00:00:00Z',
    required: false,
  })
  @Column({ nullable: true })
  endDate: Date;

  @ApiProperty({
    description: 'Date of the last successful payment',
    example: '2024-10-25T00:00:00Z',
    required: false,
  })
  @Column({ nullable: true })
  lastPaymentDate: Date;

  @ApiProperty({
    description: 'Timestamp when the subscription was created',
    example: '2024-10-25T00:00:00Z',
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the subscription was last updated',
    example: '2024-10-25T00:00:00Z',
  })
  @UpdateDateColumn()
  updatedAt: Date;
}
