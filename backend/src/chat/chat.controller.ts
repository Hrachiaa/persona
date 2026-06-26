import { Body, Controller, Delete, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { ChatDetailDto, ChatSummaryDto } from './dtos/chat.dto';
import { SendMessageDto } from './dtos/send-message.dto';

@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @ApiResponse({ status: 200, description: 'The user\'s chats (burger list)', type: [ChatSummaryDto] })
  @Get('')
  async list(@Req() req): Promise<ChatSummaryDto[]> {
    return this.chatService.listChats(req.user.id);
  }

  @ApiResponse({ status: 200, description: 'Open (or create) the portrait chat', type: ChatDetailDto })
  @Post('portrait')
  async openPortrait(@Req() req): Promise<ChatDetailDto> {
    return this.chatService.openPortraitChat(req.user.id);
  }

  @ApiResponse({ status: 200, description: 'Open (or create) a compatibility chat with a friend', type: ChatDetailDto })
  @Post('compatibility/:friendId')
  async openCompatibility(@Req() req, @Param('friendId') friendId: string): Promise<ChatDetailDto> {
    return this.chatService.openCompatibilityChat(req.user.id, friendId);
  }

  @ApiResponse({ status: 200, description: 'A chat with its full history', type: ChatDetailDto })
  @Get(':id')
  async get(@Req() req, @Param('id') id: string): Promise<ChatDetailDto> {
    return this.chatService.getChat(req.user.id, id);
  }

  @ApiResponse({ status: 200, description: 'Wipe a chat\'s history (irreversible)' })
  @Delete(':id/messages')
  async clear(@Req() req, @Param('id') id: string) {
    await this.chatService.clearHistory(req.user.id, id);
    return { ok: true };
  }

  // Streams the assistant reply as Server-Sent Events. Uses @Res() directly so we can
  // write the stream and persist on completion; ownership/validation happen before any
  // bytes are written, so failures still return a normal JSON error.
  @Post(':id/messages')
  async send(
    @Req() req,
    @Param('id') id: string,
    @Body() body: SendMessageDto,
    @Res() res: Response,
  ): Promise<void> {
    await this.chatService.streamReply(req.user.id, id, body.content, res);
  }
}
