import { HttpException, Inject, Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import type { OtpCodeRepository } from './otp-code.repository';
import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import { OtpCodeEntity } from './models/otp-code.entity';
import { t, getLang } from '../i18n/translate';

// Wrong-guess budget for a reset code before it's dropped. With this + no unlimited
// retries, a 6-digit code can't be brute-forced within its 10-minute window.
const MAX_OTP_ATTEMPTS = 5;
const OTP_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class MailService {
    constructor(
                private readonly mailerService: MailerService,
                @Inject('OTP_CODE_REPOSITORY') private readonly otpCodeRepository: OtpCodeRepository,
    ){}

    async sendCode (email: string, userId: string){
      const existingCode = await this.otpCodeRepository.findByUserId(userId);
      if(existingCode){
        await this.otpCodeRepository.deleteById(existingCode.id);
      }
      // Cryptographically secure — Math.random() is predictable and unfit for a
      // security code.
      const code = randomInt(0, 1_000_000).toString().padStart(6, '0');

      const hashCode = this.hashCode(code);

      await this.sendResetPasswordCode(email, code);
      await this.otpCodeRepository.create(userId, hashCode);
    }

    async checkCode(userId: string, code: string): Promise<boolean>{
      const otpCode: OtpCodeEntity | null = await this.otpCodeRepository.findByUserId(userId);
      if(!otpCode){
        return false
      }

      if (otpCode.createdAt < new Date(Date.now() - OTP_TTL_MS)) {
        await this.otpCodeRepository.deleteById(otpCode.id);
        return false;
      }

      if (this.safeEqual(otpCode.code, this.hashCode(code))) {
        return true;
      }

      // Wrong guess: burn an attempt, and drop the code once the budget is spent so
      // the rest of the TTL can't be used to keep guessing.
      if (otpCode.attempts + 1 >= MAX_OTP_ATTEMPTS) {
        await this.otpCodeRepository.deleteById(otpCode.id);
      } else {
        await this.otpCodeRepository.incrementAttempts(otpCode.id);
      }
      return false;
    }

    private hashCode(code: string): string {
      return createHmac('sha256', process.env.RESET_CODE_SECRET!).update(code).digest('hex');
    }

    // Constant-time compare of the two hex digests (both fixed-length SHA-256).
    private safeEqual(a: string, b: string): boolean {
      const ab = Buffer.from(a);
      const bb = Buffer.from(b);
      return ab.length === bb.length && timingSafeEqual(ab, bb);
    }

    async deleteCode(userId: string){
      const otpCode: OtpCodeEntity | null = await this.otpCodeRepository.findByUserId(userId);
      if(otpCode){
        await this.otpCodeRepository.deleteById(otpCode.id);
      }
    }

    private async sendResetPasswordCode(email: string, code: string) { 
        await this.mailerService.sendMail({
          to: email,
          from: process.env.EMAIL_USER,
          subject: t('mail.resetSubject'),
          // Per-language template: reset-password.en.hbs / reset-password.ru.hbs
          template: `reset-password.${getLang()}`,
          context: {
            code,
          },
        });
      }
}
