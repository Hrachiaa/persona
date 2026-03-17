import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';

const user = process.env.EMAIL_USER;
const pass = process.env.EMAIL_PASSWORD;
console.log(user, pass);

@Module({
  providers: [MailService],
  exports: [MailService],
  imports: [
    MailerModule.forRoot({
      transport: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: user,
          pass: pass,
        },
      },
      // defaults: {
      //   from: `"Persona" <${process.env.EMAIL_USER}>`,
      // },
      // template: {
      //   dir: __dirname + '/templates/',
      //   adapter: new HandlebarsAdapter(),
      //   options: {
      //     strict: true,
      //   },
      // },
    }),
  ],
})
export class MailModule {}
