import { OtpCodeEntity } from "./models/otp-code.entity";

export interface OtpCodeRepository {
    create(userId: string, code: string): Promise<void>;
    findByUserId(userId: string): Promise<OtpCodeEntity | null>;
    incrementAttempts(id: string): Promise<void>;
    deleteById(id: string): Promise<void>;
}