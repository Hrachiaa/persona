import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { TestsService } from './tests.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubmitTestDto } from './dtos/submit-test.dto';
import { ApiResponse } from '@nestjs/swagger';
import { TestResultDto } from './dtos/test-result.dto';
import { GetTestsDto } from './dtos/get-tests.dto';
import { QuestionsDto } from './dtos/test-questions.dto';
import { SharedResultDto } from './dtos/shared-result.dto';

@Controller('tests')
export class TestsController {
    constructor(private readonly testsService: TestsService) {}

    @UseGuards(JwtAuthGuard)
    @ApiResponse({ status: 200, description: 'All tests', type: GetTestsDto })
    @Get('')
    async getAllTests(@Req() req) {
        return this.testsService.getAllTests(req.user.id);
    }

    // Public — no auth. Lets anyone open a shared result link a user sent them.
    @ApiResponse({ status: 200, description: 'Shared test result', type: SharedResultDto })
    @Get('/shared/:token')
    async getSharedResult(@Param('token') token: string) {
        return this.testsService.getSharedResult(token);
    }

    @UseGuards(JwtAuthGuard)
    @ApiResponse({ status: 200, description: 'Test questions', type: [QuestionsDto] })
    @Get('/:testId')
    async getTestById(@Param('testId') testId: string, @Req() req) {
        return this.testsService.getTestQuesitions(testId, req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @ApiResponse({ status: 201, description: 'Share link created', schema: { example: { token: 'abc123' } } })
    @Post('/:testId/share')
    async shareTest(@Param('testId') testId: string, @Req() req) {
        return this.testsService.createShareLink(req.user.id, testId);
    }

    @UseGuards(JwtAuthGuard)
    @ApiResponse({ status: 200, description: 'Test submitted successfully', type: TestResultDto })
    @Post('/:testId/submit')
    async submitTest(@Param('testId') testId: string, @Body() testAnswers: SubmitTestDto, @Req() req) {
        return this.testsService.submitTest(req.user.id, testId, testAnswers);
    }
}
