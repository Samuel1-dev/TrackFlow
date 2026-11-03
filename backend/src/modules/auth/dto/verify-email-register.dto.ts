import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';
import { RegisterDto } from './register.dto';

export class VerifyEmailRegisterDto extends RegisterDto {
  @ApiProperty({
    example: '123456',
    description: 'Code de validation à 6 chiffres',
  })
  @IsNotEmpty({ message: 'Le code de validation est requis' })
  @IsString()
  @Length(6, 6, { message: 'Le code doit comporter exactement 6 chiffres' })
  code!: string;
}
