import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyResetOtpDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsNotEmpty({ message: "L'adresse email est requise" })
  @IsEmail({}, { message: 'Adresse email invalide' })
  email!: string;

  @ApiProperty({ example: '123456' })
  @IsNotEmpty({ message: 'Le code OTP est requis' })
  @IsString()
  @Length(6, 6, { message: 'Le code doit comporter exactement 6 chiffres' })
  code!: string;
}
