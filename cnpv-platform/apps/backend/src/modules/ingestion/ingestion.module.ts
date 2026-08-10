import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentChunk } from './entities/document-chunk.entity';
import { IngestionService } from './ingestion.service';
import { PdfExtractorService } from './pdf-extractor.service';
import { ChunkerService } from './chunker.service';
import { EmbeddingsService } from './embeddings.service';
import { VectorStoreService } from './vector-store.service';
import { StorageModule } from '../storage/storage.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentChunk]), StorageModule, AuditModule],
  providers: [IngestionService, PdfExtractorService, ChunkerService, EmbeddingsService, VectorStoreService],
  exports: [VectorStoreService, EmbeddingsService],
})
export class IngestionModule {}
