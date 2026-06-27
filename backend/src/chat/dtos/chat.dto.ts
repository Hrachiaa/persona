import { ApiProperty } from '@nestjs/swagger';
import { ChatKind, ChatRole } from '../../../generated/prisma/enums';

export type ChatKindDto = 'portrait' | 'compatibility';
export type ChatRoleDto = 'user' | 'assistant';

const toKind = (k: ChatKind): ChatKindDto => (k === ChatKind.PORTRAIT ? 'portrait' : 'compatibility');
const toRole = (r: ChatRole): ChatRoleDto => (r === ChatRole.USER ? 'user' : 'assistant');

export class ChatMessageDto {
  @ApiProperty()
  id: string;
  @ApiProperty({ enum: ['user', 'assistant'] })
  role: ChatRoleDto;
  @ApiProperty()
  content: string;
  @ApiProperty()
  createdAt: Date;

  static from(m: { id: string; role: ChatRole; content: string; createdAt: Date }): ChatMessageDto {
    return { id: m.id, role: toRole(m.role), content: m.content, createdAt: m.createdAt };
  }
}

/** A row in the chat list (burger menu). The frontend builds the title from `kind` +
 *  `friendName`, so titles stay localized client-side. */
export class ChatSummaryDto {
  @ApiProperty()
  id: string;
  @ApiProperty({ enum: ['portrait', 'compatibility'] })
  kind: ChatKindDto;
  @ApiProperty({ nullable: true })
  friendId: string | null;
  @ApiProperty({ nullable: true })
  friendName: string | null;
  @ApiProperty({ nullable: true })
  lastMessage: string | null;
  @ApiProperty()
  updatedAt: Date;

  static from(
    chat: { id: string; kind: ChatKind; friendId: string | null; updatedAt: Date; messages: { content: string }[] },
    friendName: string | null,
  ): ChatSummaryDto {
    const last = chat.messages[0]?.content ?? null;
    return {
      id: chat.id,
      kind: toKind(chat.kind),
      friendId: chat.friendId,
      friendName,
      lastMessage: last ? last.slice(0, 140) : null,
      updatedAt: chat.updatedAt,
    };
  }
}

/** A single chat with its full message history. */
export class ChatDetailDto {
  @ApiProperty()
  id: string;
  @ApiProperty({ enum: ['portrait', 'compatibility'] })
  kind: ChatKindDto;
  @ApiProperty({ nullable: true })
  friendId: string | null;
  @ApiProperty({ nullable: true })
  friendName: string | null;
  @ApiProperty({ type: [ChatMessageDto] })
  messages: ChatMessageDto[];

  static from(
    chat: { id: string; kind: ChatKind; friendId: string | null },
    messages: { id: string; role: ChatRole; content: string; createdAt: Date }[],
    friendName: string | null,
  ): ChatDetailDto {
    return {
      id: chat.id,
      kind: toKind(chat.kind),
      friendId: chat.friendId,
      friendName,
      messages: messages.map(ChatMessageDto.from),
    };
  }
}
