export class CreateUserDto {
    constructor(
        readonly email: string,
        readonly password: string,
        readonly name: string,
        readonly gender: string,
        readonly birthDate: number,
    ) { }
}
