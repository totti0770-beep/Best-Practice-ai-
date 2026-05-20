import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { DocumentChunk } from './entities/document-chunk.entity';
import { Chunk } from './chunker.service';

export interface SearchResult {
  id: string;
  documentId: string;
  versionId: string;
  contentText: string;
  pageNumber: number | null;
  chunkIndex: number;
  similarity: number;
}

@Injectable()
export class VectorStoreService {
  private readonly logger = new Logger(VectorStoreService.name);

  constructor(
    @InjectRepository(DocumentChunk)
    private readonly chunkRepo: Repository<DocumentChunk>,
    private readonly dataSource: DataSource,
  ) {}

  async insertChunks(
    documentId: string,
    versionId: string,
    hospitalId: string,
    chunks: Chunk[],
    embeddings: number[][],
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Delete existing chunks for this version
      await queryRunner.query(
        'DELETE FROM document_chunks WHERE version_id = $1',
        [versionId],
      );

      // Bulk insert with vectors
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = embeddings[i];
        const vectorStr = `[${embedding.join(',')}]`;

        await queryRunner.query(
          `INSERT INTO document_chunks
            (document_id, version_id, hospital_id, chunk_index, content_text, page_number, token_count, embedding)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8::vector)`,
          [documentId, versionId, hospitalId, chunk.chunkIndex, chunk.text,
           chunk.pageNumber, chunk.tokenCount, vectorStr],
        );
      }

      await queryRunner.commitTransaction();
      this.logger.log(`Inserted ${chunks.length} chunks for document ${documentId}`);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async search(
    queryVector: number[],
    hospitalId: string,
    topK: number,
    category?: string,
  ): Promise<SearchResult[]> {
    const vectorStr = `[${queryVector.join(',')}]`;

    const query = `
      SELECT
        dc.id,
        dc.document_id as "documentId",
        dc.version_id as "versionId",
        dc.content_text as "contentText",
        dc.page_number as "pageNumber",
        dc.chunk_index as "chunkIndex",
        1 - (dc.embedding <=> $1::vector) AS similarity
      FROM document_chunks dc
      JOIN documents d ON dc.document_id = d.id
      WHERE dc.hospital_id = $2
        AND d.status = 'active'
        AND (d.expiry_date IS NULL OR d.expiry_date > CURRENT_DATE)
        ${category ? "AND d.category = $4" : ""}
      ORDER BY dc.embedding <=> $1::vector
      LIMIT $3
    `;

    const params = category
      ? [vectorStr, hospitalId, topK, category]
      : [vectorStr, hospitalId, topK];

    return this.dataSource.query(query, params);
  }

  async deleteByDocumentId(documentId: string): Promise<void> {
    await this.chunkRepo.delete({ documentId });
  }
}
