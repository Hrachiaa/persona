import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

// Pairs are stored in canonical order (userAId <= userBId) so there's exactly one
// row per pair regardless of who requested the compatibility.
function canonical(a: string, b: string): [string, string] {
  return a <= b ? [a, b] : [b, a];
}

@Injectable()
export class CompatibilityRepository {
  constructor(private readonly prisma: PrismaService) {}

  getByPair(a: string, b: string) {
    const [userAId, userBId] = canonical(a, b);
    return this.prisma.compatibility.findUnique({
      where: { userAId_userBId: { userAId, userBId } },
    });
  }

  upsert(a: string, b: string, content: string, score: number) {
    const [userAId, userBId] = canonical(a, b);
    return this.prisma.compatibility.upsert({
      where: { userAId_userBId: { userAId, userBId } },
      create: { userAId, userBId, content, score },
      update: { content, score },
    });
  }

  /** Drop every cached compatibility involving this user (on their test retake). */
  deleteForUser(userId: string) {
    return this.prisma.compatibility.deleteMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
    });
  }
}
