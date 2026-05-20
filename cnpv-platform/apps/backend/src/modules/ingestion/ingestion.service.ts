import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PdfExtractorService } from './pdf-extractor.service';
import { ChunkerService } from './chunker.service';
import { EmbeddingsService } from './embeddings.service';
import { VectorStoreService } from './vector-store.service';
import { StorageService } from '../storage/storage.service';
import { AuditService } from '../audit/audit.service';
import { AuditEventType } from '@cnpv/shared-types';
import { DocumentChunk } from './entities/document-chunk.entity';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private readonly pdfExtractor: PdfExtractorService,
    private readonly chunker: ChunkerService,
    private readonly embeddings: EmbeddingsService,
    private readonly vectorStore: VectorStoreService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
    private readonly dataSource: DataSource,
  ) {}

  @OnEvent('document.index')
  async handleDocumentIndex(payload: {
    documentId: string;
    versionId: string;
    hospitalId: string;
  }): Promise<void> {
    const { documentId, versionId, hospitalId } = payload;
    this.logger.log(`Starting ingestion for document ${documentId}`);

    try {
      // 1. Get version's MinIO key
      const version = await this.dataSource.query(
        'SELECT minio_key FROM document_versions WHERE id = $1',
        [versionId],
      );
      if (!version.length) throw new Error(`Version ${versionId} not found`);
      const minioKey = version[0].minio_key;

      // 2. Download PDF from MinIO
      const pdfBuffer = await this.storage.getBuffer(minioKey);
      this.logger.log(`Downloaded PDF: ${pdfBuffer.length} bytes`);

      // 3. Extract text
      const extracted = await this.pdfExtractor.extract(pdfBuffer);
      this.logger.log(`Extracted: ${extracted.numPages} pages`);

      // 4. Chunk
      const chunks = this.chunker.chunk(extracted.pageTexts);
      this.logger.log(`Created ${chunks.length} chunks`);

      // 5. Generate embeddings
      const vectors = await this.embeddings.embedBatch(chunks.map((c) => c.text));
      this.logger.log(`Generated ${vectors.length} embeddings`);

      // 6. Store in pgvector
      await this.vectorStore.insertChunks(documentId, versionId, hospitalId, chunks, vectors);

      // 7. Update document page count
      await this.dataSource.query(
        'UPDATE document_versions SET page_count = $1 WHERE id = $2',
        [extracted.numPages, versionId],
      );

      await this.audit.log(AuditEventType.DOCUMENT_INDEXED, {
        hospitalId,
        entityType: 'document',
        entityId: documentId,
        metadata: { chunkCount: chunks.length, pageCount: extracted.numPages },
      });

      this.logger.log(`Ingestion complete for document ${documentId}`);
    } catch (err) {
      this.logger.error(`Ingestion failed for document ${documentId}: ${err.message}`);
      await this.audit.log(AuditEventType.DOCUMENT_INDEXED, {
        hospitalId,
        entityType: 'document',
        entityId: documentId,
        success: false,
        errorMessage: err.message,
      });
    }
  }

  @OnEvent('document.expired')
  async handleDocumentExpired(payload: { documentId: string; hospitalId: string }): Promise<void> {
    await this.vectorStore.deleteByDocumentId(payload.documentId);
    this.logger.log(`Removed chunks for expired document ${payload.documentId}`);
  }
}
