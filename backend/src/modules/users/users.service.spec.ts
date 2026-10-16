import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: any;

  const mockUser = {
    id: 'user-uuid-1',
    email: 'test@example.com',
    passwordHash: '',
    firstName: 'Samuel',
    lastName: 'Dev',
    timezone: 'UTC',
    currency: 'XOF',
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
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('should throw NotFoundException if user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findById('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return user without password hash', async () => {
      const publicUser = { ...mockUser };
      delete (publicUser as any).passwordHash;
      prisma.user.findUnique.mockResolvedValue(publicUser);

      const result = await service.findById(mockUser.id);
      expect(result.id).toBe(mockUser.id);
      expect(result).not.toHaveProperty('passwordHash');
    });
  });

  describe('updateUser', () => {
    it('should update user fields successfully', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        firstName: 'Updated',
        currency: 'EUR',
      });

      const result = await service.updateUser(mockUser.id, {
        firstName: 'Updated',
        currency: 'EUR',
      });

      expect(result.firstName).toBe('Updated');
      expect(result.currency).toBe('EUR');
    });
  });

  describe('changePassword', () => {
    it('should throw BadRequestException if current password is wrong', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.changePassword(mockUser.id, {
          currentPassword: 'wrongPassword',
          newPassword: 'newSecretPassword123',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should change password successfully when current password matches', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({ ...mockUser });

      const result = await service.changePassword(mockUser.id, {
        currentPassword: 'secret123',
        newPassword: 'newSecretPassword123',
      });

      expect(result).toHaveProperty('message');
      expect(prisma.user.update).toHaveBeenCalled();
    });
  });
});
