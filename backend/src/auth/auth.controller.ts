import { Controller, HttpCode, HttpStatus, Post, Get, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthDto } from 'src/users/dtos/auth.dto';
import { RefreshTokenDto } from './dtos/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ChangeForgottenPasswordDto, ForgotPasswordCodeDto, ForgotPasswordDto } from './dtos/forgot-password.dto';
import { AddProfileInfoDto } from './dtos/add-profile-info.dto';
import { GoogleAuthGuard } from './guards/google-auth.guard';

@ApiTags('Authorization')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('signup')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Register a new user' })
    @ApiResponse({ status: 201, description: 'User registered successfully' })
    @ApiResponse({ status: 400, description: 'Invalid request' })
    async signup(@Body() authDto: AuthDto){
        return await this.authService.signup(authDto);
    }

    @Post('add-user-profile-info')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Add user profile info' })
    @ApiResponse({ status: 200, description: 'User profile info added successfully' })
    @ApiResponse({ status: 401, description: 'Invalid refresh token' })
    @UseGuards(JwtAuthGuard)
    async addProfileInfo(@Body() profileInfoDto: AddProfileInfoDto, @Req() req){
        return await this.authService.addProfileInfo(req.user.userId, profileInfoDto);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Login' })
    @ApiResponse({ status: 200, description: 'User logged in successfully' })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async login(@Body() authDto: AuthDto){
        return await this.authService.login(authDto);
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Refresh tokens' })
    @ApiResponse({ status: 200, description: 'Tokens refreshed successfully' })
    @ApiResponse({ status: 401, description: 'Invalid refresh token' })
    async refreshTokens(@Body() refreshTokenDto: RefreshTokenDto){
        return await this.authService.refreshTokens(refreshTokenDto.refreshToken);
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Logout' })
    @ApiResponse({ status: 200, description: 'User logged out successfully' })
    @ApiResponse({ status: 401, description: 'Invalid refresh token' })
    async logout(@Body() refreshToken: RefreshTokenDto){
        return await this.authService.logout(refreshToken.refreshToken);
    }

    @Post('forgot-password')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Forgot password' })
    @ApiResponse({ status: 200, description: 'Password forgot successfully' })
    @ApiResponse({ status: 401, description: 'Invalid refresh token' })
    async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto){
        return await this.authService.forgotPassword(forgotPasswordDto.email);
    }

    @Post('forgot-password-code')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Forgot password code' })
    @ApiResponse({ status: 200, description: 'Password forgot code successfully' })
    @ApiResponse({ status: 401, description: 'Invalid refresh token' })
    async forgotPasswordCode(@Body() forgotPasswordCodeDto: ForgotPasswordCodeDto){
        return await this.authService.forgotPasswordCode(forgotPasswordCodeDto.email, forgotPasswordCodeDto.code);
    }

    @Post('change-forgotten-password')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Change forgotten password' })
    @ApiResponse({ status: 200, description: 'Password changed successfully' })
    @ApiResponse({ status: 401, description: 'Invalid refresh token' })
    async changeForgottenPassword(@Body() changeForgottenPasswordDto: ChangeForgottenPasswordDto){
        return await this.authService.changeForgottenPassword(changeForgottenPasswordDto.email, changeForgottenPasswordDto.code, changeForgottenPasswordDto.newPassword);
    }

    @UseGuards(GoogleAuthGuard)
    @Get('google/login')
    googleLogin(){
    }

    @UseGuards(GoogleAuthGuard)
    @Get('google/callback')
    googleCallback(){
    }
}
