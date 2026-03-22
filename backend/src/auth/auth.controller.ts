import { Controller, HttpCode, HttpStatus, Post, Get, Body, Req, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthDto } from 'src/users/dtos/auth.dto';
import { RefreshTokenDto } from './dtos/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ChangeForgottenPasswordDto, ForgotPasswordCodeDto, ForgotPasswordDto } from './dtos/forgot-password.dto';
import { AddProfileInfoDto } from './dtos/add-profile-info.dto';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { UserDto } from './dtos/user.dto';

class IsProfileInfoAdded {
    isProfileInfoAdded: boolean;
}

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

    @Get('me')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get user profile info' })
    @ApiResponse({ status: 200, description: 'User profile info', type: UserDto })
    @ApiResponse({ status: 401, description: 'Invalid refresh token' })
    @UseGuards(JwtAuthGuard)
    async getMe(@Req() req){
        return await this.authService.getUserInfo(req.user.id);
    }

    @Post('add-user-profile-info')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Add user profile info' })
    @ApiResponse({ status: 200, description: 'Boolean value indicating whether the user has profile info' })
    @ApiResponse({ status: 401, description: 'Invalid refresh token' })
    @UseGuards(JwtAuthGuard)
    async addProfileInfo(@Body() profileInfoDto: AddProfileInfoDto, @Req() req){
        return await this.authService.addProfileInfo(req.user.id, profileInfoDto);
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
    async googleCallback(@Req() req, @Res() res){
        const tokens = await this.authService.googleLogin(req.user);
        const params = new URLSearchParams({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            userId: tokens.userId,
        });
        res.redirect(`http://localhost:5173?${params.toString()}`);
    }
}
