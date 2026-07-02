import { Module } from '@nestjs/common';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';
import { RecommendationRepository } from './recommendation.repository';
import { CatalogService } from './catalog.service';
import { AuthModule } from '../auth/auth.module';
import { AiModule } from '../ai/ai.module';
import { TestsModule } from '../tests/tests.module';

@Module({
  controllers: [RecommendationsController],
  providers: [RecommendationsService, RecommendationRepository, CatalogService],
  imports: [AuthModule, AiModule, TestsModule],
})
export class RecommendationsModule {}
