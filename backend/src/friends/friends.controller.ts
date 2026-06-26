import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FriendsService } from './friends.service';
import { CompatibilityService } from './compatibility.service';
import { SendRequestDto } from './dtos/send-request.dto';
import { AcceptInviteDto } from './dtos/accept-invite.dto';

@UseGuards(JwtAuthGuard)
@Controller('friends')
export class FriendsController {
  constructor(
    private readonly friendsService: FriendsService,
    private readonly compatibilityService: CompatibilityService,
  ) {}

  // --- Literal routes first, so they don't get swallowed by `:friendId` ---

  @Get('')
  async list(@Req() req) {
    return this.friendsService.listFriends(req.user.id);
  }

  @Get('requests')
  async requests(@Req() req) {
    return this.friendsService.listRequests(req.user.id);
  }

  @Get('search')
  async search(@Req() req, @Query('email') email: string) {
    return this.friendsService.search(req.user.id, email ?? '');
  }

  @Get('invite')
  async invite(@Req() req) {
    return this.friendsService.getOrCreateInviteToken(req.user.id);
  }

  @Post('request')
  async sendRequest(@Req() req, @Body() dto: SendRequestDto) {
    return this.friendsService.sendRequest(req.user.id, dto.targetId);
  }

  @Post('invite/accept')
  async acceptInvite(@Req() req, @Body() dto: AcceptInviteDto) {
    return this.friendsService.acceptInvite(req.user.id, dto.token);
  }

  // --- Parameterized routes (two-segment param routes can't collide with the above) ---

  @Post(':friendshipId/accept')
  async accept(@Req() req, @Param('friendshipId') friendshipId: string) {
    await this.friendsService.accept(req.user.id, friendshipId);
    return { ok: true };
  }

  @Post(':friendshipId/decline')
  async decline(@Req() req, @Param('friendshipId') friendshipId: string) {
    await this.friendsService.decline(req.user.id, friendshipId);
    return { ok: true };
  }

  @Get(':friendId/results')
  async friendResults(@Req() req, @Param('friendId') friendId: string) {
    return this.friendsService.getFriendResults(req.user.id, friendId);
  }

  @Get(':friendId/compatibility')
  async compatibility(@Req() req, @Param('friendId') friendId: string) {
    return this.compatibilityService.getCompatibility(req.user.id, friendId);
  }

  @Delete(':friendId')
  async remove(@Req() req, @Param('friendId') friendId: string) {
    await this.friendsService.remove(req.user.id, friendId);
    return { ok: true };
  }
}
