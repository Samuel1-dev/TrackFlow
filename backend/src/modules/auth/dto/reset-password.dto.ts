import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsNotEmpty({ message: "L'adresse email est requise" })
  @IsEmail({}, { message: 'Adresse email invalide' })
  email!: string;

  @ApiProperty({ example: '123456' })
  @IsNotEmpty({ message: 'Le code OTP est requis' })
  @IsString()
  @Length(6, 6, { message: 'Le code doit comporter exactement 6 chiffres' })
  code!: string;

  @ApiProperty({ example: 'OldPassword123' })
  @IsNotEmpty({ message: "L'ancien mot de passe est requis" })
  @IsString()
  oldPassword!: string;

  @ApiProperty({ example: 'NewSecret123', minLength: 6 })
  @IsNotEmpty({ message: 'Le nouveau mot de passe est requis' })
  @IsString()
  @MinLength(6, { message: 'Le nouveau mot de passe doit comporter au moins 6 caractères' })
  newPassword!: string;

  @ApiProperty({ example: 'NewSecret123', minLength: 6 })
  @IsNotEmpty({ message: 'La confirmation du mot de passe est requise' })
  @IsString()
  @MinLength(6, { message: 'La confirmation doit comporter au moins 6 caractères' })
  confirmPassword!: string;
}
