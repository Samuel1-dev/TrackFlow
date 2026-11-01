import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class SendResetOtpDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsNotEmpty({ message: "L'adresse email est requise" })
  @IsEmail({}, { message: 'Adresse email invalide' })
  email!: string;
}
