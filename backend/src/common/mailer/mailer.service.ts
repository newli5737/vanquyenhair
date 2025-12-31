import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
    private transporter: nodemailer.Transporter;

    constructor(private configService: ConfigService) {
        this.transporter = nodemailer.createTransport({
            host: this.configService.get('SMTP_HOST'),
            port: this.configService.get('SMTP_PORT'),
            secure: false, // true for 465, false for other ports
            auth: {
                user: this.configService.get('SMTP_EMAIL'),
                pass: this.configService.get('SMTP_PASSWORD'),
            },
        });
    }

    async sendNewPassword(email: string, fullName: string, newPassword: string) {
        const mailOptions = {
            from: `"Attendance System" <${this.configService.get('SMTP_EMAIL')}>`,
            to: email,
            subject: 'Mật khẩu mới của bạn',
            html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; rounded-lg">
          <h2 style="color: #4f46e5;">Xin chào ${fullName},</h2>
          <p>Yêu cầu đặt lại mật khẩu của bạn đã được xử lý thành công.</p>
          <p>Mật khẩu mới của bạn là: <strong style="font-size: 1.2em; color: #111;">${newPassword}</strong></p>
          <p style="color: #666; font-size: 0.9em; margin-top: 20px;">Vui lòng đăng nhập và đổi mật khẩu ngay để đảm bảo an toàn.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 0.8em;">Đây là email tự động, vui lòng không trả lời.</p>
        </div>
      `,
        };

        try {
            await this.transporter.sendMail(mailOptions);
            return true;
        } catch (error) {
            console.error('Error sending email:', error);
            throw new Error('Không thể gửi email. Vui lòng thử lại sau.');
        }
    }
}
