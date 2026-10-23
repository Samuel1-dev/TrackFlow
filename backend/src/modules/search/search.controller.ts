import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @ApiOperation({
    summary: 'Recherche globale temps réel (tâches, projets, dépenses)',
    description:
      'Filtre lettre par lettre les enregistrements avec priorité aux préfixes et pagination anti-latence',
  })
  @Get()
  search(
    @CurrentUser('userId') userId: string,
    @Query() dto: SearchQueryDto,
  ) {
    return this.searchService.search(userId, dto);
  }
}
