import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter;
  private readonly fromAddress: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com');
    const port = Number(this.configService.get<number>('SMTP_PORT', 465));
    const secure =
      this.configService.get<string>('SMTP_SECURE') === 'true' || port === 465;
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    this.fromAddress =
      this.configService.get<string>('SMTP_FROM') ||
      (user ? `TaskFlow <${user}>` : 'TaskFlow <no-reply@taskflow.app>');

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  async sendVerificationOtp(email: string, code: string): Promise<void> {
    const subject = `TaskFlow - Code de validation : ${code}`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); padding: 32px 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">TaskFlow</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 14px;">Validation de votre adresse email</p>
        </div>
        <div style="padding: 32px 24px; text-align: center;">
          <p style="font-size: 15px; color: #334155; margin: 0 0 20px;">
            Merci de vous inscrire sur <strong>TaskFlow</strong>. Pour finaliser la création de votre compte, saisissez le code de validation suivant :
          </p>
          <div style="display: inline-block; background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 16px 36px; margin: 10px 0 24px;">
            <span style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #1e293b; font-family: monospace;">${code}</span>
          </div>
          <p style="font-size: 13px; color: #dc2626; font-weight: 600; margin: 0 0 16px;">
            ⏱️ Ce code expire dans 1 minute.
          </p>
          <p style="font-size: 12px; color: #64748b; margin: 0;">
            Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email en toute sécurité.
          </p>
        </div>
        <div style="background: #f8fafc; border-top: 1px solid #f1f5f9; padding: 16px 24px; text-align: center; font-size: 11px; color: #94a3b8;">
          © ${new Date().getFullYear()} TaskFlow - Gestion de tâches et finances personnelles
        </div>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: email,
        subject,
        html,
        text: `TaskFlow - Votre code de validation est : ${code}. Il expire dans 1 minute.`,
      });
      this.logger.log(`Verification OTP sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification OTP to ${email}`, error);
      throw error;
    }
  }

  async sendPasswordResetOtp(email: string, code: string): Promise<void> {
    const subject = `TaskFlow - Réinitialisation de mot de passe : ${code}`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%); padding: 32px 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">TaskFlow</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 14px;">Réinitialisation de mot de passe</p>
        </div>
        <div style="padding: 32px 24px; text-align: center;">
          <p style="font-size: 15px; color: #334155; margin: 0 0 20px;">
            Une demande de réinitialisation de mot de passe a été demandée pour votre compte. Voici votre code de sécurité :
          </p>
          <div style="display: inline-block; background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 16px 36px; margin: 10px 0 24px;">
            <span style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #1e293b; font-family: monospace;">${code}</span>
          </div>
          <p style="font-size: 13px; color: #dc2626; font-weight: 600; margin: 0 0 16px;">
            ⏱️ Ce code expire dans 1 minute.
          </p>
          <p style="font-size: 12px; color: #64748b; margin: 0;">
            Si vous n'êtes pas à l'origine de cette demande, votre mot de passe reste inchangé. Ignorez simplement ce message.
          </p>
        </div>
        <div style="background: #f8fafc; border-top: 1px solid #f1f5f9; padding: 16px 24px; text-align: center; font-size: 11px; color: #94a3b8;">
          © ${new Date().getFullYear()} TaskFlow - Gestion de tâches et finances personnelles
        </div>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: email,
        subject,
        html,
        text: `TaskFlow - Votre code de réinitialisation est : ${code}. Il expire dans 1 minute.`,
      });
      this.logger.log(`Password reset OTP sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset OTP to ${email}`, error);
      throw error;
    }
  }
}
