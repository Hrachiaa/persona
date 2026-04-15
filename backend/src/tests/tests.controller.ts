import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { TestsService } from './tests.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { SubmitTestDto } from './dtos/submit-test.dto';
import { ApiResponse } from '@nestjs/swagger';
import { TestResultDto } from './dtos/test-result.dto';
import { GetTestsDto } from './dtos/get-tests.dto';
import { QuestionsDto } from './dtos/test-questions.dto';

@Controller('tests')
export class TestsController {
    constructor(private readonly testsService: TestsService) {}

    @UseGuards(JwtAuthGuard)
    @ApiResponse({ status: 200, description: 'All tests', type: GetTestsDto })
    @Get('')
    async getAllTests(@Req() req) {
        return this.testsService.getAllTests(req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @ApiResponse({ status: 200, description: 'Test questions', type: [QuestionsDto] })
    @Get('/:testId')
    async getTestById(@Param('testId') testId: string, @Req() req) {
        return this.testsService.getTestQuesitions(testId);
    }

    @UseGuards(JwtAuthGuard)
    @ApiResponse({ status: 200, description: 'Test submitted successfully', type: TestResultDto })
    @Post('/:testId/submit')
    async submitTest(@Param('testId') testId: string, @Body() testAnswers: SubmitTestDto, @Req() req) {
        return this.testsService.submitTest(req.user.id, testId, testAnswers);
    }
}
