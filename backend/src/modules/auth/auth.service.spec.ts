import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';
import {
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { OtpType } from '@prisma/client';

// ─── Helpers ────────────────────────────────────────────────────────────────

const makeOtp = (overrides: Partial<{
  id: string;
  email: string;
  code: string;
  type: OtpType;
  used: boolean;
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
}> = {}) => ({
  id: 'otp-uuid-1',
  email: 'test@example.com',
  code: '123456',
  type: OtpType.EMAIL_VERIFICATION,
  used: false,
  attempts: 0,
  expiresAt: new Date(Date.now() + 5 * 60 * 1000), // valid: 5 min from now
  createdAt: new Date(),
  ...overrides,
});

// ─── Test Suite ─────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;
  let mailService: any;

  const mockUser = {
    id: 'user-uuid-1',
    email: 'test@example.com',
    passwordHash: '',
    firstName: 'Samuel',
    lastName: 'Dev',
    timezone: 'UTC',
    currency: 'XOF',
    refreshHash: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeAll(async () => {
    mockUser.passwordHash = await bcrypt.hash('secret123', 10);
  });

  beforeEach(async () => {
    const mockPrisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue(mockUser),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      expenseCategory: {
        create: jest.fn().mockResolvedValue({ id: 'cat-1' }),
      },
      otpCode: {
        findFirst: jest.fn(),
        create: jest.fn().mockResolvedValue(makeOtp()),
        update: jest.fn().mockResolvedValue(makeOtp()),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      $transaction: jest.fn().mockImplementation(async (arg) => {
        if (typeof arg === 'function') {
          return arg({
            user: {
              create: jest.fn().mockResolvedValue(mockUser),
            },
            expenseCategory: {
              create: jest.fn().mockResolvedValue({ id: 'cat-1' }),
            },
          });
        }
        // array-style transaction
        return Promise.all(arg.map((p: Promise<any>) => p));
      }),
    };

    const mockJwt = {
      signAsync: jest.fn().mockResolvedValue('mock-token'),
      verifyAsync: jest
        .fn()
        .mockResolvedValue({ sub: mockUser.id, email: mockUser.email }),
      verify: jest.fn(),
    };

    const mockConfig = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'JWT_EXPIRES_IN') return '15m';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
        return 'mock-secret';
      }),
      getOrThrow: jest.fn().mockImplementation((key: string) => {
        if (key === 'JWT_EXPIRES_IN') return '15m';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
        return 'mock-secret';
      }),
    };

    const mockMailService = {
      sendVerificationOtp: jest.fn().mockResolvedValue(undefined),
      sendPasswordResetOtp: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    jwtService = module.get(JwtService);
    mailService = module.get(MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── register (classic) ───────────────────────────────────────────────────

  describe('register', () => {
    it('should throw ConflictException if user email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.register({
          email: 'test@example.com',
          password: 'password123',
          firstName: 'Samuel',
          lastName: 'Dev',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should register a new user and return tokens', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.register({
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'Samuel',
        lastName: 'Dev',
      });

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });
  });

  // ── login ────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'unknown@example.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.login({ email: 'test@example.com', password: 'wrongPassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return user and tokens on successful login', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.login({
        email: 'test@example.com',
        password: 'secret123',
      });

      expect(result.user.id).toBe(mockUser.id);
      expect(result.accessToken).toBe('mock-token');
      expect(result.refreshToken).toBe('mock-token');
    });
  });

  // ── sendVerificationOtp ──────────────────────────────────────────────────

  describe('sendVerificationOtp', () => {
    it('should throw ConflictException if user already exists', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.sendVerificationOtp({ email: 'test@example.com' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should invalidate old codes and send OTP email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.sendVerificationOtp({
        email: 'new@example.com',
      });

      expect(prisma.otpCode.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: OtpType.EMAIL_VERIFICATION, used: false }),
          data: { used: true },
        }),
      );
      expect(prisma.otpCode.create).toHaveBeenCalled();
      expect(mailService.sendVerificationOtp).toHaveBeenCalledWith(
        'new@example.com',
        expect.any(String),
      );
      expect(result.expiresInSeconds).toBe(300);
    });

    it('should generate a 6-digit code', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await service.sendVerificationOtp({ email: 'new@example.com' });

      const createCall = prisma.otpCode.create.mock.calls[0][0];
      expect(createCall.data.code).toMatch(/^\d{6}$/);
    });
  });

  // ── verifyEmailAndRegister ───────────────────────────────────────────────

  describe('verifyEmailAndRegister', () => {
    const dto = {
      email: 'new@example.com',
      code: '123456',
      password: 'securePass1!',
      firstName: 'Test',
      lastName: 'User',
    };

    it('should throw ConflictException if user already exists', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.verifyEmailAndRegister(dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw BadRequestException if no active OTP found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.otpCode.findFirst.mockResolvedValue(null);

      await expect(service.verifyEmailAndRegister(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('[SECURITY] should throw BadRequestException if attempts >= 5 (brute-force blocked)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.otpCode.findFirst.mockResolvedValue(makeOtp({ attempts: 5 }));

      const err = await service.verifyEmailAndRegister(dto).catch((e) => e);
      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.message).toContain('bloqué');
    });

    it('[SECURITY] should throw BadRequestException and increment attempts on wrong code', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.otpCode.findFirst.mockResolvedValue(makeOtp({ code: '999999', attempts: 2 }));

      const err = await service.verifyEmailAndRegister({ ...dto, code: '111111' }).catch((e) => e);
      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.message).toContain('tentative');
      expect(prisma.otpCode.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { attempts: { increment: 1 } },
        }),
      );
    });

    it('[SECURITY] should throw BadRequestException if OTP is expired', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.otpCode.findFirst.mockResolvedValue(
        makeOtp({ expiresAt: new Date(Date.now() - 1000) }),
      );

      await expect(service.verifyEmailAndRegister(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create user, mark OTP used, and return tokens on valid code', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.otpCode.findFirst.mockResolvedValue(makeOtp());

      const result = await service.verifyEmailAndRegister(dto);

      expect(prisma.otpCode.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { used: true } }),
      );
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });
  });

  // ── sendPasswordResetOtp ─────────────────────────────────────────────────

  describe('sendPasswordResetOtp', () => {
    it('should throw NotFoundException if user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.sendPasswordResetOtp({ email: 'ghost@example.com' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should invalidate old codes and send reset OTP email', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.sendPasswordResetOtp({
        email: 'test@example.com',
      });

      expect(prisma.otpCode.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: OtpType.PASSWORD_RESET, used: false }),
          data: { used: true },
        }),
      );
      expect(mailService.sendPasswordResetOtp).toHaveBeenCalledWith(
        'test@example.com',
        expect.any(String),
      );
      expect(result.expiresInSeconds).toBe(300);
    });
  });

  // ── verifyResetOtp ───────────────────────────────────────────────────────

  describe('verifyResetOtp', () => {
    const dto = { email: 'test@example.com', code: '123456' };

    it('should throw BadRequestException if no active OTP', async () => {
      prisma.otpCode.findFirst.mockResolvedValue(null);

      await expect(service.verifyResetOtp(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('[SECURITY] should throw BadRequestException if attempts >= 5', async () => {
      prisma.otpCode.findFirst.mockResolvedValue(
        makeOtp({ type: OtpType.PASSWORD_RESET, attempts: 5 }),
      );

      const err = await service.verifyResetOtp(dto).catch((e) => e);
      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.message).toContain('bloqué');
    });

    it('[SECURITY] should throw BadRequestException if OTP expired', async () => {
      prisma.otpCode.findFirst.mockResolvedValue(
        makeOtp({ type: OtpType.PASSWORD_RESET, expiresAt: new Date(Date.now() - 1000) }),
      );

      await expect(service.verifyResetOtp(dto)).rejects.toThrow(BadRequestException);
    });

    it('[SECURITY] should increment attempts on wrong code', async () => {
      prisma.otpCode.findFirst.mockResolvedValue(
        makeOtp({ type: OtpType.PASSWORD_RESET, code: '999999', attempts: 1 }),
      );

      await expect(service.verifyResetOtp({ ...dto, code: '000000' })).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.otpCode.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { attempts: { increment: 1 } } }),
      );
    });

    it('should return valid:true on correct code', async () => {
      prisma.otpCode.findFirst.mockResolvedValue(
        makeOtp({ type: OtpType.PASSWORD_RESET }),
      );

      const result = await service.verifyResetOtp(dto);
      expect(result.valid).toBe(true);
    });
  });

  // ── resetPassword ────────────────────────────────────────────────────────

  describe('resetPassword', () => {
    const dto = {
      email: 'test@example.com',
      code: '123456',
      newPassword: 'newSecret456!',
      confirmPassword: 'newSecret456!',
    };

    it('should throw BadRequestException if passwords do not match', async () => {
      await expect(
        service.resetPassword({ ...dto, confirmPassword: 'mismatch' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.resetPassword(dto)).rejects.toThrow(NotFoundException);
    });

    it('[SECURITY] should throw BadRequestException if no active OTP', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.otpCode.findFirst.mockResolvedValue(null);

      await expect(service.resetPassword(dto)).rejects.toThrow(BadRequestException);
    });

    it('[SECURITY] should throw BadRequestException if attempts >= 5 (blocked)', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.otpCode.findFirst.mockResolvedValue(
        makeOtp({ type: OtpType.PASSWORD_RESET, attempts: 5 }),
      );

      const err = await service.resetPassword(dto).catch((e) => e);
      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.message).toContain('bloqué');
    });

    it('[SECURITY] should throw BadRequestException if OTP expired', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.otpCode.findFirst.mockResolvedValue(
        makeOtp({ type: OtpType.PASSWORD_RESET, expiresAt: new Date(Date.now() - 1000) }),
      );

      await expect(service.resetPassword(dto)).rejects.toThrow(BadRequestException);
    });

    it('[SECURITY] should increment attempts on wrong code', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.otpCode.findFirst.mockResolvedValue(
        makeOtp({ type: OtpType.PASSWORD_RESET, code: '999999', attempts: 2 }),
      );

      await expect(service.resetPassword({ ...dto, code: '000000' })).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.otpCode.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { attempts: { increment: 1 } } }),
      );
    });

    it('should update password and revoke sessions on success', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.otpCode.findFirst.mockResolvedValue(
        makeOtp({ type: OtpType.PASSWORD_RESET }),
      );

      const result = await service.resetPassword(dto);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  // ── refreshToken ─────────────────────────────────────────────────────────

  describe('refreshToken', () => {
    it('should throw UnauthorizedException if token is invalid', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('invalid'));

      await expect(service.refreshToken('bad-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if refresh hash does not match', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: mockUser.id, email: mockUser.email });
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, refreshHash: 'different-hash' });

      await expect(service.refreshToken('valid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return new tokens on valid refresh', async () => {
      const fakeToken = 'valid-refresh-token';
      // Hash must match what hashToken(fakeToken) returns
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createHash } = require('crypto') as typeof import('crypto');
      const hash = createHash('sha256').update(fakeToken).digest('hex');

      jwtService.verifyAsync.mockResolvedValue({ sub: mockUser.id, email: mockUser.email });
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, refreshHash: hash });

      const result = await service.refreshToken(fakeToken);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });
  });

  // ── logout ───────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('should do nothing if no refresh token provided', async () => {
      await service.logout(undefined);
      expect(prisma.user.updateMany).not.toHaveBeenCalled();
    });

    it('should clear refresh hash on valid token', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: mockUser.id });

      await service.logout('valid-token');

      expect(prisma.user.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { refreshHash: null },
        }),
      );
    });

    it('[SECURITY] should not throw if token is expired during logout', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('expired'));

      await expect(service.logout('expired-token')).resolves.not.toThrow();
    });
  });
});
