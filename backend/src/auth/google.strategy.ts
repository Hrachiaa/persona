import { PassportStrategy } from "@nestjs/passport";
import { Strategy, VerifyCallback } from "passport-google-oauth20";
import { Inject, Injectable } from "@nestjs/common";
import googleOauthConfig from "./config/google-oauth.config";
import type { ConfigType } from "@nestjs/config";
import { AuthService } from "./auth.service";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy) {
    constructor(
                @Inject (googleOauthConfig.KEY) private googleConfig: ConfigType<typeof googleOauthConfig>,
                private readonly authService: AuthService,
            ) {
        super({
            clientID: googleConfig.clientId!,
            clientSecret: googleConfig.clientSecret!,
            callbackURL: googleConfig.callbackURL!,
            scope: ['email', 'profile'],
        });
    }

    async validate(accessToken: string, refreshToken: string, profile: any, done: VerifyCallback): Promise<any> {
        const email = profile.emails?.[0]?.value?.trim().toLowerCase();
        const user = await this.authService.validateGoogleUser({
            email,
            googleId: profile.id,
        });
        done(null, user);
    }
}