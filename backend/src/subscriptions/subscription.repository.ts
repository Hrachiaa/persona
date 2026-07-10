import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ChatRole, SubscriptionStatus } from '../../generated/prisma/enums';
import type { Subscription } from '../../generated/prisma/client';

export interface SubscriptionWrite {
  paddleSubscriptionId?: string | null;
  paddleCustomerId?: string | null;
  priceId: string;
  status: SubscriptionStatus;
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd?: boolean;
  trialEndsAt?: Date | null;
}

@Injectable()
export class SubscriptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: string): Promise<Subscription | null> {
    return this.prisma.subscription.findUnique({ where: { userId } });
  }

  findByPaddleId(paddleSubscriptionId: string): Promise<Subscription | null> {
    return this.prisma.subscription.findUnique({ where: { paddleSubscriptionId } });
  }

  /** Create-or-replace the user's single subscription row (one per user). */
  upsertForUser(userId: string, data: SubscriptionWrite): Promise<Subscription> {
    return this.prisma.subscription.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  }

  update(id: string, data: Partial<SubscriptionWrite>): Promise<Subscription> {
    return this.prisma.subscription.update({ where: { id }, data });
  }

  /**
   * Messages the user has ever sent across ALL their chats — the free-tier
   * meter deliberately counts globally, not per chat. Lives here (not in
   * ChatRepository) so ChatModule can depend on SubscriptionsModule without a
   * cycle. Only USER turns count; assistant replies are not the user's quota.
   */
  countUserMessages(userId: string): Promise<number> {
    return this.prisma.chatMessage.count({
      where: { role: ChatRole.USER, chat: { userId } },
    });
  }
}
