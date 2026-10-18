import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { FilterExpensesDto } from './dto/filter-expenses.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('Finance - Expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('finance')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @ApiOperation({ summary: 'Lister les catégories de dépenses (système + personnelles)' })
  @Get('categories')
  getCategories(@CurrentUser('userId') userId: string) {
    return this.expensesService.getCategories(userId);
  }

  @ApiOperation({ summary: 'Ajouter une dépense' })
  @Post('expenses')
  create(@CurrentUser('userId') userId: string, @Body() dto: CreateExpenseDto) {
    return this.expensesService.create(userId, dto);
  }

  @ApiOperation({ summary: 'Lister les dépenses avec filtres et total calculé' })
  @Get('expenses')
  findAll(@CurrentUser('userId') userId: string, @Query() filters: FilterExpensesDto) {
    return this.expensesService.findAll(userId, filters);
  }

  @ApiOperation({ summary: 'Détail d\'une dépense' })
  @Get('expenses/:id')
  findOne(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.expensesService.findOne(userId, id);
  }

  @ApiOperation({ summary: 'Modifier une dépense' })
  @Put('expenses/:id')
  update(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(userId, id, dto);
  }

  @ApiOperation({ summary: 'Supprimer une dépense' })
  @Delete('expenses/:id')
  @HttpCode(HttpStatus.OK)
  remove(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.expensesService.remove(userId, id);
  }
}
