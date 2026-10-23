import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

export type SearchScopeType = 'all' | 'tasks' | 'projects' | 'expenses';

export class SearchQueryDto {
  @ApiProperty({ description: 'Terme de recherche tapé par l\'utilisateur' })
  @IsString()
  q: string;

  @ApiPropertyOptional({
    description: 'Périmètre de recherche (tous, tâches, projets ou dépenses)',
    enum: ['all', 'tasks', 'projects', 'expenses'],
    default: 'all',
  })
  @IsOptional()
  @IsIn(['all', 'tasks', 'projects', 'expenses'])
  type?: SearchScopeType = 'all';

  @ApiPropertyOptional({ description: 'Numéro de page (1-indexé)', default: 1 })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : 1))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Nombre d\'éléments par page', default: 6 })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : 6))
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 6;
}
