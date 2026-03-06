export class User {
    id: string;
    email: string;
    name: string;
    gender: string;
    birthDate: number;
    emailVerified: boolean;
    googleId: string | null;
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