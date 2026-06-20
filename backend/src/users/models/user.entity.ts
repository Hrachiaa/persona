import { ApiProperty } from "@nestjs/swagger";

export class UserEntity {
    @ApiProperty({example: 'cmmoycsta0000s4v3jcmr451j', description: 'User ID'})
    id: string;
    @ApiProperty({example: 'example@gmail.com', description: 'User Email'})
    email: string;
    @ApiProperty({example: 'John Doe', description: 'User Name'})
    name: string | null;
    @ApiProperty({example: 'Male', description: 'User Gender'})
    gender: string | null;
    @ApiProperty({example: 1234567890, description: 'User Birth Date'})
    birthDate: number | null;
    @ApiProperty({example: 'en', description: 'User UI language'})
    language: string;
    @ApiProperty({example: true, description: 'User Email Verified'})
    emailVerified: boolean;
    @ApiProperty({example: 'cmmoycsta0000s4v3jcmr451j', description: 'User Google ID'})
    googleId: string | null;
    @ApiProperty({example: 'password', description: 'User Password'})
    password: string;
    @ApiProperty({example: 'abc123', description: 'Stable personal invite token', nullable: true})
    inviteToken: string | null;
    constructor(
        id: string,
        email: string,
        name: string | null,
        gender: string | null,
        birthDate: number | null,
        emailVerified: boolean,
        googleId: string | null,
        password: string,
        inviteToken: string | null = null,
        language: string = 'en',
    ) {
        this.id = id;
        this.email = email;
        this.name = name;
        this.gender = gender;
        this.birthDate = birthDate;
        this.language = language;
        this.emailVerified = emailVerified;
        this.googleId = googleId;
        this.password = password;
        this.inviteToken = inviteToken;
    }
}