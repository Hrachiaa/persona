import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ChatKind, ChatRole } from '../../generated/prisma/enums';

@Injectable()
export class ChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.chat.findUnique({ where: { id } });
  }

  /** Every chat the user owns, newest activity first, with a short last-message preview. */
  listForUser(userId: string) {
    return this.prisma.chat.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
  }

  findPortrait(userId: string) {
    return this.prisma.chat.findFirst({ where: { userId, kind: ChatKind.PORTRAIT } });
  }

  findCompatibility(userId: string, friendId: string) {
    return this.prisma.chat.findFirst({
      where: { userId, kind: ChatKind.COMPATIBILITY, friendId },
    });
  }

  createPortrait(userId: string) {
    return this.prisma.chat.create({ data: { userId, kind: ChatKind.PORTRAIT } });
  }

  createCompatibility(userId: string, friendId: string) {
    return this.prisma.chat.create({
      data: { userId, kind: ChatKind.COMPATIBILITY, friendId },
    });
  }

  getMessages(chatId: string) {
    return this.prisma.chatMessage.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * The last `limit` messages in chronological order — the LLM context window
   * (the full history stays in the DB and in getMessages). The negative take
   * means "last N of this ordering"; id is the tie-breaker because a turn's two
   * rows are createMany'd with the identical timestamp (cuids are monotonic
   * within a process, so user precedes assistant).
   */
  getRecentMessages(chatId: string, limit: number) {
    return this.prisma.chatMessage.findMany({
      where: { chatId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: -limit,
    });
  }

  /** Append a turn (user + assistant) and bump the chat's activity timestamp. */
  async appendTurn(
    chatId: string,
    turns: { role: ChatRole; content: string }[],
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.chatMessage.createMany({
        data: turns.map((t) => ({ chatId, role: t.role, content: t.content })),
      }),
      this.prisma.chat.update({ where: { id: chatId }, data: { updatedAt: new Date() } }),
    ]);
  }

  /** Wipe a chat's history; the chat row itself stays so the user can keep talking. */
  async clearMessages(chatId: string): Promise<void> {
    await this.prisma.chatMessage.deleteMany({ where: { chatId } });
  }

  /** Display names for a set of user ids (for compatibility-chat titles). */
  async getUserNames(ids: string[]): Promise<Map<string, { name: string | null; email: string }>> {
    if (!ids.length) return new Map();
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, email: true },
    });
    return new Map(users.map((u) => [u.id, { name: u.name, email: u.email }]));
  }
}
