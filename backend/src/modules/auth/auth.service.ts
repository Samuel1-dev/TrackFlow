import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { createHash } from 'crypto';
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
