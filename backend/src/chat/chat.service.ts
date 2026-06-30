import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import { ChatRepository } from './chat.repository';
import { AiService } from '../ai/ai.service';
import { TestResultRepository } from '../tests/test-result.repository';
import { PortraitRepository } from '../portrait/portrait.repository';
import { FriendsService } from '../friends/friends.service';
import { CompatibilityRepository } from '../friends/compatibility.repository';
import { TEST_ORDER } from '../tests/test-order';
import { TestResultType } from '../tests/models/test-result.entity';
import { ChatKind, ChatRole } from '../../generated/prisma/enums';
import {
  buildPortraitChatSystemPrompt,
  buildCompatibilityChatSystemPrompt,
} from '../ai/prompts/chat.prompt';
import { ChatDetailDto, ChatSummaryDto } from './dtos/chat.dto';
import { getLang, t } from '../i18n/translate';

type Chat = { id: string; userId: string; kind: ChatKind; friendId: string | null };

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly chatRepository: ChatRepository,
    private readonly aiService: AiService,
    private readonly testResultRepository: TestResultRepository,
    private readonly portraitRepository: PortraitRepository,
    private readonly friendsService: FriendsService,
    private readonly compatibilityRepository: CompatibilityRepository,
  ) {}

  /** The user's chats for the burger list, with friend names resolved for titles. */
  async listChats(userId: string): Promise<ChatSummaryDto[]> {
    const chats = await this.chatRepository.listForUser(userId);
    const friendIds = chats.map((c) => c.friendId).filter((id): id is string => !!id);
    const names = await this.chatRepository.getUserNames(friendIds);
    return chats.map((c) => ChatSummaryDto.from(c, this.displayName(c.friendId, names)));
  }

  /** The user's portrait chat — one per user, created on first open. */
  async openPortraitChat(userId: string): Promise<ChatDetailDto> {
    await this.assertTestsCompleted(userId);
    const chat = (await this.chatRepository.findPortrait(userId)) ?? (await this.chatRepository.createPortrait(userId));
    return this.toDetail(chat);
  }

  /** A chat about the user's compatibility with a friend — one per pair. */
  async openCompatibilityChat(userId: string, friendId: string): Promise<ChatDetailDto> {
    await this.assertTestsCompleted(userId);
    await this.friendsService.assertFriends(userId, friendId);
    const chat =
      (await this.chatRepository.findCompatibility(userId, friendId)) ??
      (await this.chatRepository.createCompatibility(userId, friendId));
    return this.toDetail(chat);
  }

  async getChat(userId: string, chatId: string): Promise<ChatDetailDto> {
    const chat = await this.requireOwnedChat(userId, chatId);
    return this.toDetail(chat);
  }

  async clearHistory(userId: string, chatId: string): Promise<void> {
    const chat = await this.requireOwnedChat(userId, chatId);
    await this.chatRepository.clearMessages(chat.id);
  }

  /**
   * Streams the assistant's reply to a new user message over SSE. The user + assistant
   * turn is persisted only once the stream completes (clean retry semantics — a failed
   * or aborted stream leaves no dangling message). Context (test results + the portrait/
   * compatibility synthesis) is rebuilt per message so it always reflects the latest data.
   */
  async streamReply(userId: string, chatId: string, content: string, res: Response): Promise<void> {
    // Resolve everything that can fail BEFORE writing any SSE bytes, so failures
    // surface as a normal JSON error response instead of a half-open stream.
    const chat = await this.requireOwnedChat(userId, chatId);
    const lang = getLang();
    const systemPrompt = await this.buildSystemPrompt(chat, lang);
    const history = await this.chatRepository.getMessages(chat.id);
    const messages = [
      ...history.map((m) => ({
        role: m.role === ChatRole.USER ? ('user' as const) : ('assistant' as const),
        content: m.content,
      })),
      { role: 'user' as const, content },
    ];

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // disable proxy buffering (nginx)
    res.flushHeaders?.();

    let aborted = false;
    res.on('close', () => { aborted = true; });

    let reply = '';
    try {
      for await (const delta of this.aiService.streamChat(systemPrompt, messages)) {
        if (aborted) break;
        reply += delta;
        res.write(`data: ${JSON.stringify({ delta })}\n\n`);
      }
      if (aborted) return; // client left — nothing persisted, they can retry
      await this.chatRepository.appendTurn(chat.id, [
        { role: ChatRole.USER, content },
        { role: ChatRole.ASSISTANT, content: reply },
      ]);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      this.logger.error(`Chat stream failed for chatId=${chat.id}`, error as Error);
      if (!aborted) {
        res.write(`data: ${JSON.stringify({ error: t('errors.chat.streamFailed') })}\n\n`);
        res.end();
      }
    }
  }

  // ─── internals ────────────────────────────────────────────────────────────────

  /** Chats are gated behind finishing every test — same rule as recommendations. */
  private async assertTestsCompleted(userId: string): Promise<void> {
    const results = await this.testResultRepository.getTestResults(userId);
    if (this.resolveTargetTests(results).length < TEST_ORDER.length) {
      throw new ForbiddenException(t('errors.chat.locked'));
    }
  }

  /** Completed test types in canonical order; an "invalid" IQ result doesn't count
   *  (mirrors RecommendationsService.resolveTargetTests / PortraitService). */
  private resolveTargetTests(results: { testType: string; result: unknown }[]): string[] {
    const iqResult = results.find((r) => r.testType === 'iq');
    const iqInvalid = (iqResult?.result as { reliability?: string } | undefined)?.reliability === 'invalid';
    const completed = new Set(results.filter((r) => !(r.testType === 'iq' && iqInvalid)).map((r) => r.testType));
    return TEST_ORDER.filter((type) => completed.has(type));
  }

  private async requireOwnedChat(userId: string, chatId: string): Promise<Chat> {
    const chat = await this.chatRepository.findById(chatId);
    if (!chat || chat.userId !== userId) throw new NotFoundException(t('errors.chat.notFound'));
    return chat;
  }

  private async toDetail(chat: Chat): Promise<ChatDetailDto> {
    const [messages, friendName] = await Promise.all([
      this.chatRepository.getMessages(chat.id),
      this.resolveFriendName(chat.friendId),
    ]);
    return ChatDetailDto.from(chat, messages, friendName);
  }

  private async resolveFriendName(friendId: string | null): Promise<string | null> {
    if (!friendId) return null;
    const names = await this.chatRepository.getUserNames([friendId]);
    return this.displayName(friendId, names);
  }

  private displayName(
    friendId: string | null,
    names: Map<string, { name: string | null; email: string }>,
  ): string | null {
    if (!friendId) return null;
    const u = names.get(friendId);
    return u ? u.name || u.email : null;
  }

  /** Builds the system prompt (instructions + fresh context) for a chat. */
  private async buildSystemPrompt(chat: Chat, lang: string): Promise<string> {
    if (chat.kind === ChatKind.PORTRAIT) {
      const results = await this.testResultRepository.getTestResults(chat.userId);
      const portrait = await this.safePortraitContent(chat.userId);
      return buildPortraitChatSystemPrompt({ results: this.ordered(results), portrait, lang });
    }

    const friendId = chat.friendId!;
    const [myResults, friendResults, compatibility, friendName] = await Promise.all([
      this.testResultRepository.getTestResults(chat.userId),
      this.testResultRepository.getTestResults(friendId),
      this.safeCompatibilityContent(chat.userId, friendId),
      this.resolveFriendName(friendId),
    ]);
    return buildCompatibilityChatSystemPrompt({
      resultsA: this.ordered(myResults),
      resultsB: this.ordered(friendResults),
      compatibility,
      friendName,
      lang,
    });
  }

  /** The cached portrait text, if one exists — read directly so the chat never blocks
   *  on (or triggers) a generation, and isn't gated by the portrait tab's logic. */
  private async safePortraitContent(userId: string): Promise<string | null> {
    try {
      const p = await this.portraitRepository.getByUserId(userId);
      return p?.content ?? null;
    } catch {
      return null;
    }
  }

  private async safeCompatibilityContent(userId: string, friendId: string): Promise<string | null> {
    try {
      const c = await this.compatibilityRepository.getByPair(userId, friendId);
      return c?.content ?? null;
    } catch {
      return null;
    }
  }

  /** Results in canonical test order, typed for the prompt builders. */
  private ordered(results: { testType: string; result: unknown }[]): { testType: string; result: TestResultType }[] {
    return TEST_ORDER.map((type) => results.find((r) => r.testType === type))
      .filter((r): r is NonNullable<typeof r> => Boolean(r))
      .map((r) => ({ testType: r.testType, result: r.result as TestResultType }));
  }
}
