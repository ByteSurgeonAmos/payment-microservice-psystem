import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class Payment {
  @ApiProperty({
    description: 'Payment ID',
    example: 'pay_123456789',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Payment amount',
    example: 99.99,
  })
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'USD',
  })
  @Column()
  currency: string;

  @ApiProperty({
    description: 'Payment status',
    enum: ['PENDING', 'COMPLETED', 'FAILED'],
    example: 'COMPLETED',
  })
  @Column()
  status: string;

  @ApiProperty({
    description: 'PayPal order ID',
    example: 'ord_123456789',
  })
  @Column({ nullable: true })
  paypalOrderId: string;

  @ApiProperty({
    description: 'User ID',
    example: 'usr_123456789',
  })
  @Column()
  userId: string;

  @ApiProperty({
    description: 'Subscription ID',
    example: 'sub_123456789',
    required: false,
  })
  @Column({ nullable: true })
  subscriptionId: string;

  @ApiProperty({
    description: 'Payment method',
    enum: ['paypal', 'card'],
    example: 'card',
  })
  @Column()
  paymentMethod: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-10-25T10:30:00Z',
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-10-25T10:30:00Z',
  })
  @UpdateDateColumn()
  updatedAt: Date;
}
