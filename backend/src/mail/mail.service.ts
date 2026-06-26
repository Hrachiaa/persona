import { HttpException, Inject, Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import type { OtpCodeRepository } from './otp-code.repository';
import { createHash, createHmac } from 'crypto';
import { OtpCodeEntity } from './models/otp-code.entity';
import { t, getLang } from '../i18n/translate';

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
      const code = Math.floor(Math.random() * 1000000)
        .toString()
        .padStart(6, '0');
      
      const hashCode = createHmac('sha256', process.env.RESET_CODE_SECRET!)
        .update(code)
        .digest('hex');

      await this.sendResetPasswordCode(email, code);
      await this.otpCodeRepository.create(userId, hashCode);
    }

    async checkCode(userId: string, code: string): Promise<boolean>{
      const otpCode: OtpCodeEntity | null = await this.otpCodeRepository.findByUserId(userId);
      if(!otpCode){
        return false
      }
      
      if (otpCode.createdAt < new Date(Date.now() - 10 * 60 * 1000)) {
        await this.otpCodeRepository.deleteById(otpCode.id);
        return false;
      }

      const hashCode = createHmac('sha256', process.env.RESET_CODE_SECRET!)
        .update(code)
        .digest('hex');
      return otpCode.code === hashCode;
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
