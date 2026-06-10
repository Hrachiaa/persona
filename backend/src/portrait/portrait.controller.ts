import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PortraitService } from './portrait.service';
import { PortraitDto } from './dtos/portrait.dto';

@Controller('portrait')
export class PortraitController {
  constructor(private readonly portraitService: PortraitService) {}

  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'AI portrait, or its unlock progress', type: PortraitDto })
  @Get('')
  async getPortrait(@Req() req) {
    return this.portraitService.getPortrait(req.user.id);
  }
}
