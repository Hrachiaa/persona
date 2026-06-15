import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RecommendationsService } from './recommendations.service';
import { RecommendationListDto } from './dtos/recommendation.dto';
import { SwipeDto } from './dtos/swipe.dto';
import { MediaKind } from '../ai/prompts/recommendations.prompt';

function parseMediaType(type: string): MediaKind {
  if (type === 'film' || type === 'book') return type;
  throw new BadRequestException("Query param 'type' must be 'film' or 'book'");
}

@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Recommendation queue, or its unlock progress', type: RecommendationListDto })
  @Get('')
  async list(@Req() req, @Query('type') type: string) {
    return this.recommendationsService.getRecommendations(req.user.id, parseMediaType(type));
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/swipe')
  async swipe(@Req() req, @Param('id') id: string, @Body() body: SwipeDto) {
    return this.recommendationsService.swipe(req.user.id, id, body.verdict);
  }

  @UseGuards(JwtAuthGuard)
  @Post('reset')
  async reset(@Req() req, @Query('type') type: string) {
    await this.recommendationsService.reset(req.user.id, parseMediaType(type));
    return { ok: true };
  }
}
