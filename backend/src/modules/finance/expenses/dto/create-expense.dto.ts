import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsUUID,
  IsNumber,
  IsPositive,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateExpenseDto {
  @ApiProperty({ description: 'UUID de la catégorie de dépense' })
  @IsNotEmpty()
  @IsUUID()
  categoryId: string;

  @ApiProperty({ example: 5000, description: 'Montant positif de la dépense (ex : 5000 FCFA)' })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive({ message: 'Le montant doit être positif' })
  @Type(() => Number)
  amount: number;

  @ApiProperty({ example: '2026-10-15T12:00:00.000Z', description: 'Date de la dépense' })
  @IsNotEmpty()
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ example: 'Courses au marché', description: 'Description optionnelle' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;
}
