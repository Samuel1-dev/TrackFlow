import { ApiPropertyOptional } from '@nestjs/swagger';
import {
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

export class UpdateBudgetDto {
  @ApiPropertyOptional({ enum: BudgetPeriodType, example: BudgetPeriodType.MONTHLY })
  @IsOptional()
  @IsEnum(BudgetPeriodType)
  periodType?: BudgetPeriodType;

  @ApiPropertyOptional({ example: '2026-10-01T00:00:00.000Z', description: 'Début de la période' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-10-31T23:59:59.000Z', description: 'Fin de la période' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: 60000, description: 'Nouveau montant initial du budget' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  initialAmount?: number;

  @ApiPropertyOptional({ example: 15000, description: 'Nouvel objectif d\'épargne' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  savingsTarget?: number;

  @ApiPropertyOptional({ example: 'XOF', description: 'Code devise ISO 4217' })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  currency?: string;
}
