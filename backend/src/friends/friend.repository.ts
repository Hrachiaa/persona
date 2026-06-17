import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { FriendshipStatus } from '../../generated/prisma/client';

// Selects just the public fields of the "other" user in a friendship row.
const USER_SELECT = { id: true, name: true, email: true } as const;

@Injectable()
export class FriendRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(requesterId: string, addresseeId: string) {
    return this.prisma.friendship.create({ data: { requesterId, addresseeId } });
  }

  findById(id: string) {
    return this.prisma.friendship.findUnique({ where: { id } });
  }

  /** The friendship between two users, regardless of who sent the request. */
  findPair(a: string, b: string) {
    return this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: a, addresseeId: b },
          { requesterId: b, addresseeId: a },
        ],
      },
    });
  }

  accept(id: string) {
    return this.prisma.friendship.update({
      where: { id },
      data: { status: FriendshipStatus.ACCEPTED },
    });
  }

  deleteById(id: string) {
    return this.prisma.friendship.delete({ where: { id } });
  }

  /** Accepted friendships involving the user, with the other user's public fields. */
  listAccepted(userId: string) {
    return this.prisma.friendship.findMany({
      where: {
        status: FriendshipStatus.ACCEPTED,
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      include: { requester: { select: USER_SELECT }, addressee: { select: USER_SELECT } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /** Pending requests the user received (to accept/decline). */
  listIncoming(userId: string) {
    return this.prisma.friendship.findMany({
      where: { status: FriendshipStatus.PENDING, addresseeId: userId },
      include: { requester: { select: USER_SELECT } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Pending requests the user sent. */
  listOutgoing(userId: string) {
    return this.prisma.friendship.findMany({
      where: { status: FriendshipStatus.PENDING, requesterId: userId },
      include: { addressee: { select: USER_SELECT } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
