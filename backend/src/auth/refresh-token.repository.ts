export interface RefreshToken {
    id: string;
    userId: string;
    token: string;
}

export interface RefreshTokenRepository {
    create(userId: string, token: string): Promise<RefreshToken>;
    findByUserId(userId: string): Promise<RefreshToken | null>;
    findByToken(token: string): Promise<RefreshToken | null>;
    deleteByUserId(userId: string): Promise<void>;
}