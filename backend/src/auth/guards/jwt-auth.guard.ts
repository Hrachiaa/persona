import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { t } from "../../i18n/translate";

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(private jwtService: JwtService) {}

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        try {
            const authHeader = request.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                throw new UnauthorizedException(t('errors.noToken'));
            }
            const token = authHeader.split(' ')[1];
            const decoded = this.jwtService.verify(token, {secret: process.env.JWT_ACCESS_SECRET});
            request.user = decoded;
            return true;
        } catch (error) {
            throw new UnauthorizedException(t('errors.invalidToken'));
        }
    }
}