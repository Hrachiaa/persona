// A friend / search hit as the frontend sees it. `relation` describes the viewer's
// standing with this user so the UI can show the right action (Add / Pending / etc.).
export type FriendRelation =
  | 'none'
  | 'pending_out'
  | 'pending_in'
  | 'friends'
  | 'self';

export class FriendDto {
  readonly id: string; // the other user's id
  readonly name: string | null;
  readonly email: string;
  readonly relation?: FriendRelation;
  // Present on pending requests so the addressee can accept/decline by id.
  readonly friendshipId?: string;

  constructor(init: Partial<FriendDto> & { id: string; email: string }) {
    Object.assign(this, init);
  }
}
