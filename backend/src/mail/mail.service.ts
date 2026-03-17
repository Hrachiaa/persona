import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
    constructor(private readonly mailerService: MailerService){}

    async sendUserConfirmation(email: string) { 
        await this.mailerService.sendMail({
          to: email,
          from: process.env.EMAIL_USER,
          subject: 'Confirm your email',
          template: 'reset-password',
          context: {
            code: '123456',
          },
        });
      }
}
