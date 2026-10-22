import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsEnum,
  IsDateString,
  IsNumber,
  IsPositive,
  Min,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { BudgetPeriodType } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateBudgetDto {
  @ApiProperty({ enum: BudgetPeriodType, example: BudgetPeriodType.MONTHLY })
  @IsNotEmpty()
  @IsEnum(BudgetPeriodType)
  periodType: BudgetPeriodType;

  @ApiProperty({ example: '2026-10-01T00:00:00.000Z', description: 'Début de la période' })
  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-10-31T23:59:59.000Z', description: 'Fin de la période' })
  @IsNotEmpty()
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: 50000, description: 'Montant initial du budget (ex : 50000 FCFA)' })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  initialAmount: number;

  @ApiProperty({ example: 10000, description: 'Objectif d\'épargne pour la période' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  savingsTarget: number;

  @ApiPropertyOptional({ example: 'XOF', default: 'XOF', description: 'Code devise ISO 4217' })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  currency?: string;

  @ApiPropertyOptional({ example: true, description: 'Remplacer le budget existant en cas de chevauchement' })
  @IsOptional()
  replaceExisting?: boolean;
}
