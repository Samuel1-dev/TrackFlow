import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Response, Request, CookieOptions } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from '../../common/decorators/public.decorator';

const REFRESH_COOKIE = 'refreshToken';
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 jours

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Lu à chaque appel (et non au chargement du module), pour que NODE_ENV soit bien défini
  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth',
    };
  }

  private setRefreshCookie(response: Response, token: string) {
    response.cookie(REFRESH_COOKIE, token, {
      ...this.cookieOptions(),
      maxAge: REFRESH_MAX_AGE,
    });
  }

  private getRefreshCookie(request: Request): string | undefined {
    const cookies = request.cookies as Record<string, unknown> | undefined;
    const token =
      (cookies?.[REFRESH_COOKIE] as string | undefined) ||
      (request.body as Record<string, unknown> | undefined)?.refreshToken;
    return typeof token === 'string' && token ? token : undefined;
  }

  @Public()
  @ApiOperation({ summary: 'Inscription d’un nouvel utilisateur' })
  @ApiResponse({ status: 201, description: 'Utilisateur créé avec succès' })
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { user, accessToken, refreshToken } =
      await this.authService.register(dto);

    this.setRefreshCookie(response, refreshToken);
    return { user, accessToken, refreshToken };
  }

  @Public()
  @ApiOperation({ summary: 'Connexion utilisateur' })
  @ApiResponse({ status: 200, description: 'Connexion réussie' })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { user, accessToken, refreshToken } =
      await this.authService.login(dto);

    this.setRefreshCookie(response, refreshToken);
    return { user, accessToken, refreshToken };
  }

  @Public()
  @ApiOperation({ summary: 'Rafraîchir le jeton d’accès' })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Req() request: Request,
    @Body() body: { refreshToken?: string },
    @Res({ passthrough: true }) response: Response,
  ) {
    const token = this.getRefreshCookie(request);
    if (!token) {
      throw new UnauthorizedException('Aucun jeton de rafraîchissement fourni');
    }

    try {
      const tokens = await this.authService.refreshToken(token);
      this.setRefreshCookie(response, tokens.refreshToken);
      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (error) {
      // Token invalide, expiré ou révoqué : on supprime le cookie devenu inutile
      response.clearCookie(REFRESH_COOKIE, this.cookieOptions());
      throw error;
    }
  }

  @Public()
  @ApiOperation({ summary: 'Déconnexion utilisateur' })
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(this.getRefreshCookie(request));
    response.clearCookie(REFRESH_COOKIE, this.cookieOptions());
    return { message: 'Déconnexion réussie' };
  }
}
