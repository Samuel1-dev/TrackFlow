export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  timezone: string;
  currency: string;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  timezone?: string;
  currency?: string;
}

export interface SendVerificationOtpDto {
  email: string;
}

export interface VerifyEmailRegisterDto extends RegisterDto {
  code: string;
}

export interface SendResetOtpDto {
  email: string;
}

export interface VerifyResetOtpDto {
  email: string;
  code: string;
}

export interface ResetPasswordDto {
  email: string;
  code: string;
  newPassword: string;
  confirmPassword: string;
}
