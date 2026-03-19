import { AuthDto } from "./dtos/auth.dto";
import { UserEntity } from "./models/user.enity";
import { AddProfileInfoDto } from "src/auth/dtos/add-profile-info.dto";

export interface UserRepository {
    create(data: AuthDto): Promise<UserEntity>;
    getAllUsers(): Promise<UserEntity[]>;
    getUserByEmail(email: string): Promise<UserEntity | null>;
    getUserById(id: string): Promise<UserEntity | null>;
    changePassword(id: string, password: string): Promise<void>;
    addProfileInfo(id: string, profileInfoDto: AddProfileInfoDto): Promise<void>;
}