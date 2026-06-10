import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PortraitRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getByUserId(userId: string) {
    return await this.prisma.portrait.findUnique({ where: { userId } });
  }

  async upsert(userId: string, content: string, basedOn: string[]) {
    return await this.prisma.portrait.upsert({
      where: { userId },
      create: { userId, content, basedOn },
      update: { content, basedOn },
    });
  }
}
