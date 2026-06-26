import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { FriendshipStatus } from '../../generated/prisma/client';
import { UsersService } from '../users/users.service';
import { TestResultRepository } from '../tests/test-result.repository';
import { FriendRepository } from './friend.repository';
import { FriendDto, FriendRelation } from './dtos/friend.dto';
import { t } from '../i18n/translate';

@Injectable()
export class FriendsService {
  constructor(
    private readonly friendRepository: FriendRepository,
    private readonly usersService: UsersService,
    private readonly testResultRepository: TestResultRepository,
  ) {}

  /** Find a user by email and report the viewer's standing with them. */
  async search(meId: string, email: string): Promise<FriendDto | null> {
    const user = await this.usersService.getUserByEmail(email.trim().toLowerCase());
    if (!user) return null;
    if (user.id === meId) {
      return new FriendDto({ id: user.id, name: user.name, email: user.email, relation: 'self' });
    }
    const relation = await this.relationWith(meId, user.id);
    return new FriendDto({ id: user.id, name: user.name, email: user.email, relation });
  }

  /**
   * Send a friend request. If the target already sent us one, this accepts it
   * (mutual intent → instant friendship). Idempotent-ish: rejects duplicates.
   */
  async sendRequest(meId: string, targetId: string): Promise<{ status: FriendRelation }> {
    if (meId === targetId) throw new BadRequestException(t('errors.friends.cannotAddYourself'));
    const target = await this.usersService.getUserById(targetId);
    if (!target) throw new NotFoundException(t('errors.userNotFound'));

    const existing = await this.friendRepository.findPair(meId, targetId);
    if (existing) {
      if (existing.status === FriendshipStatus.ACCEPTED) {
        return { status: 'friends' };
      }
      // A pending request the other way around → accept it now (mutual).
      if (existing.addresseeId === meId) {
        await this.friendRepository.accept(existing.id);
        return { status: 'friends' };
      }
      // We already have an outgoing pending request.
      return { status: 'pending_out' };
    }

    await this.friendRepository.create(meId, targetId);
    return { status: 'pending_out' };
  }

  async accept(meId: string, friendshipId: string): Promise<void> {
    const fr = await this.friendRepository.findById(friendshipId);
    if (!fr || fr.addresseeId !== meId) throw new NotFoundException(t('errors.friends.requestNotFound'));
    if (fr.status === FriendshipStatus.ACCEPTED) return;
    await this.friendRepository.accept(friendshipId);
  }

  /** Decline an incoming request, or cancel an outgoing one — both just delete the row. */
  async decline(meId: string, friendshipId: string): Promise<void> {
    const fr = await this.friendRepository.findById(friendshipId);
    if (!fr || (fr.addresseeId !== meId && fr.requesterId !== meId)) {
      throw new NotFoundException(t('errors.friends.requestNotFound'));
    }
    await this.friendRepository.deleteById(friendshipId);
  }

  async remove(meId: string, otherId: string): Promise<void> {
    const fr = await this.friendRepository.findPair(meId, otherId);
    if (!fr) throw new NotFoundException(t('errors.friends.notFriends'));
    await this.friendRepository.deleteById(fr.id);
  }

  async listFriends(meId: string): Promise<FriendDto[]> {
    const rows = await this.friendRepository.listAccepted(meId);
    return rows.map((r) => {
      const other = r.requesterId === meId ? r.addressee : r.requester;
      return new FriendDto({
        id: other.id,
        name: other.name,
        email: other.email,
        relation: 'friends',
        friendshipId: r.id,
      });
    });
  }

  async listRequests(meId: string): Promise<{ incoming: FriendDto[]; outgoing: FriendDto[] }> {
    const [incoming, outgoing] = await Promise.all([
      this.friendRepository.listIncoming(meId),
      this.friendRepository.listOutgoing(meId),
    ]);
    return {
      incoming: incoming.map(
        (r) =>
          new FriendDto({
            id: r.requester.id,
            name: r.requester.name,
            email: r.requester.email,
            relation: 'pending_in',
            friendshipId: r.id,
          }),
      ),
      outgoing: outgoing.map(
        (r) =>
          new FriendDto({
            id: r.addressee.id,
            name: r.addressee.name,
            email: r.addressee.email,
            relation: 'pending_out',
            friendshipId: r.id,
          }),
      ),
    };
  }

  /** The viewer's stable personal invite link token (minted once, then reused). */
  async getOrCreateInviteToken(meId: string): Promise<{ token: string }> {
    const me = await this.usersService.getUserById(meId);
    if (!me) throw new NotFoundException(t('errors.userNotFound'));
    if (me.inviteToken) return { token: me.inviteToken };
    const token = randomBytes(9).toString('base64url');
    await this.usersService.setInviteToken(meId, token);
    return { token };
  }

  /** Opening someone's invite link → send them a friend request (they confirm). */
  async acceptInvite(meId: string, token: string): Promise<{ status: FriendRelation }> {
    const owner = await this.usersService.getUserByInviteToken(token);
    if (!owner) throw new NotFoundException(t('errors.friends.inviteNotFound'));
    return this.sendRequest(meId, owner.id);
  }

  /** A friend's completed test results — only visible once you're friends. */
  async getFriendResults(meId: string, friendId: string) {
    await this.assertFriends(meId, friendId);
    const results = await this.testResultRepository.getTestResultsWithTest(friendId);
    return results.map((r) => ({
      testType: r.testType,
      testName: r.test.testName,
      result: r.result,
    }));
  }

  /** Throws unless the two users are accepted friends. */
  async assertFriends(meId: string, otherId: string): Promise<void> {
    const fr = await this.friendRepository.findPair(meId, otherId);
    if (!fr || fr.status !== FriendshipStatus.ACCEPTED) {
      throw new ForbiddenException(t('errors.friends.notFriends'));
    }
  }

  private async relationWith(meId: string, otherId: string): Promise<FriendRelation> {
    const fr = await this.friendRepository.findPair(meId, otherId);
    if (!fr) return 'none';
    if (fr.status === FriendshipStatus.ACCEPTED) return 'friends';
    return fr.requesterId === meId ? 'pending_out' : 'pending_in';
  }
}
