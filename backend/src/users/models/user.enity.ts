import { ApiProperty } from "@nestjs/swagger";

export class User {
    @ApiProperty({example: 'cmmoycsta0000s4v3jcmr451j', description: 'User ID'})
    id: string;
    @ApiProperty({example: 'example@gmail.com', description: 'User Email'})
    email: string;
    @ApiProperty({example: 'John Doe', description: 'User Name'})
    name: string;
    @ApiProperty({example: 'Male', description: 'User Gender'})
    gender: string;
    @ApiProperty({example: 1234567890, description: 'User Birth Date'})
    birthDate: number;
    @ApiProperty({example: true, description: 'User Email Verified'})
    emailVerified: boolean;
    @ApiProperty({example: 'cmmoycsta0000s4v3jcmr451j', description: 'User Google ID'})
    googleId: string | null;
    @ApiProperty({example: 'password', description: 'User Password'})
    password: string | null;
    constructor(
        id: string,
        email: string,
        name: string,
        gender: string,
        birthDate: number,
        emailVerified: boolean,
        googleId: string | null,
        password: string | null,
    ) {
        this.id = id;
        this.email = email;
        this.name = name;
        this.gender = gender;
        this.birthDate = birthDate;
        this.emailVerified = emailVerified;
        this.googleId = googleId;
        this.password = password;
    }
}