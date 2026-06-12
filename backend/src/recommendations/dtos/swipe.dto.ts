import { IsIn } from 'class-validator';

export class SwipeDto {
  @IsIn(['LIKED', 'DISLIKED'])
  readonly verdict: 'LIKED' | 'DISLIKED';
}
