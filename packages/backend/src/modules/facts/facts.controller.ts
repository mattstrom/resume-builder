import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';

import { CurrentUser } from '../auth/index.js';
import {
  type CreateExpressionDto,
  type CreateFactDto,
  type LinkFactDto,
  type UpdateFactDto,
  FactsService,
} from './facts.service.js';

@Controller('api/facts')
export class FactsController {
  constructor(private readonly factsService: FactsService) {}

  // ─── Facts ────────────────────────────────────────────────────────────────

  @Get()
  findAll(
    @CurrentUser('sub') uid: string,
    @Query('kind') kind?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
  ) {
    return this.factsService.findAll(uid, { kind, entityType, entityId });
  }

  @Get(':id')
  findById(@CurrentUser('sub') uid: string, @Param('id') id: string) {
    return this.factsService.findById(uid, id);
  }

  @Post()
  create(@CurrentUser('sub') uid: string, @Body() dto: CreateFactDto) {
    return this.factsService.create(uid, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser('sub') uid: string,
    @Param('id') id: string,
    @Body() dto: UpdateFactDto,
  ) {
    return this.factsService.update(uid, id, dto);
  }

  @Delete(':id')
  async delete(@CurrentUser('sub') uid: string, @Param('id') id: string) {
    await this.factsService.delete(uid, id);
    return { success: true };
  }

  // ─── Embeddings ───────────────────────────────────────────────────────────

  @Put(':id/embedding')
  async setEmbedding(
    @CurrentUser('sub') uid: string,
    @Param('id') id: string,
    @Body() body: { embedding: number[] },
  ) {
    await this.factsService.setEmbedding(uid, id, body.embedding);
    return { success: true };
  }

  @Post('similar')
  findSimilar(
    @CurrentUser('sub') uid: string,
    @Body() body: { embedding: number[]; limit?: number },
  ) {
    return this.factsService.findSimilar(uid, body.embedding, body.limit);
  }

  // ─── Expressions ──────────────────────────────────────────────────────────

  @Get(':factId/expressions')
  findExpressions(
    @CurrentUser('sub') uid: string,
    @Param('factId') factId: string,
  ) {
    return this.factsService.findExpressions(uid, factId);
  }

  @Post(':factId/expressions')
  createExpression(
    @CurrentUser('sub') uid: string,
    @Param('factId') factId: string,
    @Body() dto: CreateExpressionDto,
  ) {
    return this.factsService.createExpression(uid, factId, dto);
  }

  @Delete(':factId/expressions/:id')
  async deleteExpression(
    @CurrentUser('sub') uid: string,
    @Param('factId') factId: string,
    @Param('id') id: string,
  ) {
    await this.factsService.deleteExpression(uid, factId, id);
    return { success: true };
  }
}

@Controller('api/resumes')
export class ResumeFactsController {
  constructor(private readonly factsService: FactsService) {}

  @Get(':resumeId/facts')
  findResumeFacts(@Param('resumeId') resumeId: string) {
    return this.factsService.findResumeFacts(resumeId);
  }

  @Post(':resumeId/facts')
  linkFact(
    @CurrentUser('sub') uid: string,
    @Param('resumeId') resumeId: string,
    @Body() body: { factId: string } & LinkFactDto,
  ) {
    const { factId, ...dto } = body;
    return this.factsService.linkFact(uid, resumeId, factId, dto);
  }

  @Delete(':resumeId/facts/:factId')
  async unlinkFact(
    @Param('resumeId') resumeId: string,
    @Param('factId') factId: string,
  ) {
    await this.factsService.unlinkFact(resumeId, factId);
    return { success: true };
  }
}
