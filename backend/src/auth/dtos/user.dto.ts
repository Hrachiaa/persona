export class UserDto {
    id: string;
    googleId: string | null;
    email: string;
    emailVerified: boolean;
    name: string | null;
    birthDate: Date | null;
    gender: string | null;
    language: string;
}