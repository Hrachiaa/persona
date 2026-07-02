export class OtpCodeEntity {
    id: string;
    userId: string;
    code: string;
    attempts: number;
    createdAt: Date;
}