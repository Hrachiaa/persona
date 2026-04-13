import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { TestsService } from './tests.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { SubmitTestDto } from './dtos/submit-test.dto';

@Controller('tests')
export class TestsController {
    constructor(private readonly testsService: TestsService) {}

    @UseGuards(JwtAuthGuard)
    @Get('get-all-tests')
    async getAllTests(@Req() req) {
        return this.testsService.getAllTests(req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Get('/:testId')
    async getTestById(@Param('testId') testId: string, @Req() req) {
        return this.testsService.getTestById(testId);
    }

    @UseGuards(JwtAuthGuard)
    @Post('/:testId/submit')
    async submitTest(@Param('testId') testId: string, @Body() testAnswers: SubmitTestDto, @Req() req) {
        return this.testsService.submitTest(req.user.id, testId, testAnswers);
    }
}
