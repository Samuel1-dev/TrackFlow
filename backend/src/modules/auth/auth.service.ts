import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SendVerificationOtpDto } from './dto/send-verification-otp.dto';
import { VerifyEmailRegisterDto } from './dto/verify-email-register.dto';
import { SendResetOtpDto } from './dto/send-reset-otp.dto';
import { VerifyResetOtpDto } from './dto/verify-reset-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { OtpType } from '@prisma/client';
import { createHash, randomInt } from 'crypto';
import * as bcrypt from 'bcryptjs';

const DEFAULT_CATEGORIES = [
  { name: 'Alimentation', icon: 'utensils', color: '#10B981' },
  { name: 'Transport', icon: 'car', color: '#3B82F6' },
  { name: 'Logement', icon: 'home', color: '#8B5CF6' },
  { name: 'Santé', icon: 'heart-pulse', color: '#EC4899' },
  { name: 'Loisirs', icon: 'gamepad-2', color: '#F59E0B' },
  { name: 'Études', icon: 'graduation-cap', color: '#6366F1' },
  { name: 'Autres', icon: 'more-horizontal', color: '#6B7280' },
];

interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async storeRefreshHash(userId: string, refreshToken: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshHash: this.hashToken(refreshToken) },
    });
  }

  private generate6DigitOtp(): string {
    return randomInt(100000, 1000000).toString();
  }

  // ─── OTP : Inscription et Validation d'email ──────────────────────────────

  async sendVerificationOtp(dto: SendVerificationOtpDto) {
    const email = dto.email.toLowerCase().trim();

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('Un utilisateur existe déjà avec cet email');
    }

    // Invalider les anciens codes non utilisés pour cet email
    await this.prisma.otpCode.updateMany({
      where: { email, type: OtpType.EMAIL_VERIFICATION, used: false },
      data: { used: true },
    });

    const code = this.generate6DigitOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes (300s)

    await this.prisma.otpCode.create({
      data: {
        email,
        code,
        type: OtpType.EMAIL_VERIFICATION,
        expiresAt,
        used: false,
      },
    });

    await this.mailService.sendVerificationOtp(email, code);

    return {
      success: true,
      message: 'Code de validation envoyé avec succès',
      expiresInSeconds: 300,
    };
  }

  async verifyEmailAndRegister(dto: VerifyEmailRegisterDto) {
    const email = dto.email.toLowerCase().trim();

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('Un utilisateur existe déjà avec cet email');
    }

    // Cherche le dernier OTP actif (non utilisé, non expiré) pour cet email
    const otpRecord = await this.prisma.otpCode.findFirst({
      where: {
        email,
        type: OtpType.EMAIL_VERIFICATION,
        used: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new BadRequestException(
        'Aucun code de validation actif. Veuillez demander un nouveau code.',
      );
    }

    if (otpRecord.attempts >= 5) {
      throw new BadRequestException(
        'Code bloqué après trop de tentatives. Veuillez demander un nouveau code.',
      );
    }

    if (otpRecord.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException(
        'Le code de validation a expiré (durée 5 minutes). Veuillez demander un nouveau code.',
      );
    }

    if (otpRecord.code !== dto.code.trim()) {
      // Incrémenter le compteur de tentatives
      await this.prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });
      const attemptsLeft = 4 - otpRecord.attempts;
      throw new BadRequestException(
        attemptsLeft > 0
          ? `Code invalide. Il vous reste ${attemptsLeft} tentative(s).`
          : 'Code bloqué après trop de tentatives. Veuillez demander un nouveau code.',
      );
    }

    // Marquer l'OTP comme utilisé
    await this.prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { used: true },
    });

    // Création du compte utilisateur et des catégories par défaut
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          timezone: dto.timezone || 'UTC',
          currency: dto.currency || 'XOF',
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          timezone: true,
          currency: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      for (const cat of DEFAULT_CATEGORIES) {
        await tx.expenseCategory.create({
          data: {
            userId: newUser.id,
            name: cat.name,
            icon: cat.icon,
            color: cat.color,
          },
        });
      }

      return newUser;
    });

    const tokens = await this.generateTokens(user.id, user.email);
    await this.storeRefreshHash(user.id, tokens.refreshToken);

    return {
      user,
      ...tokens,
    };
  }

  // ─── OTP : Mot de passe oublié ────────────────────────────────────────────

  async sendPasswordResetOtp(dto: SendResetOtpDto) {
    const email = dto.email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    if (!user) {
      throw new NotFoundException('Aucun compte associé à cette adresse email');
    }

    // Invalider les anciens codes non utilisés pour ce reset
    await this.prisma.otpCode.updateMany({
      where: { email, type: OtpType.PASSWORD_RESET, used: false },
      data: { used: true },
    });

    const code = this.generate6DigitOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes (300s)

    await this.prisma.otpCode.create({
      data: {
        email,
        code,
        type: OtpType.PASSWORD_RESET,
        expiresAt,
        used: false,
      },
    });

    await this.mailService.sendPasswordResetOtp(email, code);

    return {
      success: true,
      message: 'Code de réinitialisation envoyé avec succès',
      expiresInSeconds: 300,
    };
  }

  async verifyResetOtp(dto: VerifyResetOtpDto) {
    const email = dto.email.toLowerCase().trim();

    const otpRecord = await this.prisma.otpCode.findFirst({
      where: {
        email,
        type: OtpType.PASSWORD_RESET,
        used: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new BadRequestException('Aucun code de réinitialisation actif. Veuillez en demander un nouveau.');
    }

    if (otpRecord.attempts >= 5) {
      throw new BadRequestException(
        'Code bloqué après trop de tentatives. Veuillez demander un nouveau code.',
      );
    }

    if (otpRecord.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException(
        'Le code a expiré (durée 5 minutes). Veuillez demander un nouveau code.',
      );
    }

    if (otpRecord.code !== dto.code.trim()) {
      await this.prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });
      const attemptsLeft = 4 - otpRecord.attempts;
      throw new BadRequestException(
        attemptsLeft > 0
          ? `Code invalide. Il vous reste ${attemptsLeft} tentative(s).`
          : 'Code bloqué après trop de tentatives. Veuillez demander un nouveau code.',
      );
    }

    return {
      valid: true,
      message: 'Code vérifié avec succès',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const email = dto.email.toLowerCase().trim();

    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException(
        'Le nouveau mot de passe et sa confirmation ne correspondent pas',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const otpRecord = await this.prisma.otpCode.findFirst({
      where: {
        email,
        type: OtpType.PASSWORD_RESET,
        used: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new BadRequestException('Aucun code de réinitialisation actif. Veuillez en demander un nouveau.');
    }

    if (otpRecord.attempts >= 5) {
      throw new BadRequestException(
        'Code bloqué après trop de tentatives. Veuillez demander un nouveau code.',
      );
    }

    if (otpRecord.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException(
        'Le code a expiré. Veuillez demander un nouveau code.',
      );
    }

    if (otpRecord.code !== dto.code.trim()) {
      await this.prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });
      const attemptsLeft = 4 - otpRecord.attempts;
      throw new BadRequestException(
        attemptsLeft > 0
          ? `Code invalide. Il vous reste ${attemptsLeft} tentative(s).`
          : 'Code bloqué après trop de tentatives. Veuillez demander un nouveau code.',
      );
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);

    // Mise à jour mot de passe, révocation des sessions actives, consommation de l'OTP
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: newPasswordHash,
          refreshHash: null,
        },
      }),
      this.prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { used: true },
      }),
    ]);

    return {
      success: true,
      message: 'Votre mot de passe a été réinitialisé avec succès',
    };
  }

  // ─── Enregistrement classique & Connexion ──────────────────────────────────

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('Un utilisateur existe déjà avec cet email');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          timezone: dto.timezone || 'UTC',
          currency: dto.currency || 'XOF',
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          timezone: true,
          currency: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Création automatique des catégories de dépenses initiales pour l'utilisateur
      for (const cat of DEFAULT_CATEGORIES) {
        await tx.expenseCategory.create({
          data: {
            userId: newUser.id,
            name: cat.name,
            icon: cat.icon,
            color: cat.color,
          },
        });
      }

      return newUser;
    });

    const tokens = await this.generateTokens(user.id, user.email);
    await this.storeRefreshHash(user.id, tokens.refreshToken);

    return {
      user,
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const isValidPassword = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isValidPassword) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const tokens = await this.generateTokens(user.id, user.email);
    await this.storeRefreshHash(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        timezone: user.timezone,
        currency: user.currency,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException(
        'Jeton de rafraîchissement invalide ou expiré',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    // Le token doit correspondre à celui enregistré (sinon : révoqué ou déjà utilisé)
    if (
      !user?.refreshHash ||
      user.refreshHash !== this.hashToken(refreshToken)
    ) {
      throw new UnauthorizedException('Session expirée');
    }

    // Rotation : nouveau couple, l'ancien refresh token devient inutilisable
    const tokens = await this.generateTokens(user.id, user.email);
    await this.storeRefreshHash(user.id, tokens.refreshToken);
    return tokens;
  }

  private async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
        expiresIn: this.configService.getOrThrow<string>(
          'JWT_EXPIRES_IN',
        ) as `${number}${'s' | 'm' | 'h' | 'd'}`,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.getOrThrow<string>(
          'JWT_REFRESH_EXPIRES_IN',
        ) as `${number}${'s' | 'm' | 'h' | 'd'}`,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  async logout(refreshToken?: string) {
    if (!refreshToken) return;

    const secret = this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(
        refreshToken,
        { secret },
      );
      await this.prisma.user.updateMany({
        where: { id: payload.sub },
        data: { refreshHash: null },
      });
    } catch {
      // Ignore invalid or expired refresh tokens during logout.
    }
  }
}
