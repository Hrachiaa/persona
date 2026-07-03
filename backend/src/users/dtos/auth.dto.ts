import { Transform } from "class-transformer";
import { IsEmail, IsIn, IsOptional, IsString, Length } from "class-validator";

// HTTP body for signup and login. Deliberately limited to email + password:
// `googleId` / `emailVerified` are set server-side only. With the ValidationPipe's
// `forbidNonWhitelisted`, sending either field is rejected (no mass-assignment).
export class AuthDto {
    @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
    @IsString({message: 'Email must be a string'})
    @IsEmail({}, {message: 'Email must be a valid email'})
    readonly email: string;

    @IsString({message: 'Password must be a string'})
    @Length(8, 32, {message: 'Password must be between 8 and 32 characters long'})
    readonly password: string;
}

// Signup additionally accepts the UI language the auth screen was shown in, so
// the account starts in the language the user already chose instead of the
// column default ('en') — the pre-survey screens would otherwise flip language.
export class SignupDto extends AuthDto {
    @IsOptional()
    @IsString()
    @IsIn(['en', 'ru'])
    readonly language?: string;
}
