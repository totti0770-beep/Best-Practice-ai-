import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface Chunk {
  text: string;
  pageNumber: number;
  chunkIndex: number;
  tokenCount: number;
}

@Injectable()
export class ChunkerService {
  private readonly chunkSize: number;
  private readonly chunkOverlap: number;

  constructor(private readonly configService: ConfigService) {
    this.chunkSize = parseInt(configService.get('RAG_CHUNK_SIZE', '500'));
    this.chunkOverlap = parseInt(configService.get('RAG_CHUNK_OVERLAP', '50'));
  }

  chunk(pageTexts: string[]): Chunk[] {
    const chunks: Chunk[] = [];
    let chunkIndex = 0;

    for (let pageNum = 0; pageNum < pageTexts.length; pageNum++) {
      const pageText = pageTexts[pageNum];
      if (!pageText || pageText.trim().length < 20) continue;

      // Split into sentences (Arabic-aware)
      const sentences = this.splitSentences(pageText);
      let currentChunk = '';
      let currentTokens = 0;

      for (const sentence of sentences) {
        const sentenceTokens = this.estimateTokens(sentence);

        if (currentTokens + sentenceTokens > this.chunkSize && currentChunk.trim()) {
          chunks.push({
            text: currentChunk.trim(),
            pageNumber: pageNum + 1,
            chunkIndex: chunkIndex++,
            tokenCount: currentTokens,
          });

          // Overlap: keep last N tokens worth of text
          const overlapText = this.getOverlapText(currentChunk, this.chunkOverlap);
          currentChunk = overlapText + ' ' + sentence;
          currentTokens = this.estimateTokens(currentChunk);
        } else {
          currentChunk += ' ' + sentence;
          currentTokens += sentenceTokens;
        }
      }

      if (currentChunk.trim()) {
        chunks.push({
          text: currentChunk.trim(),
          pageNumber: pageNum + 1,
          chunkIndex: chunkIndex++,
          tokenCount: currentTokens,
        });
      }
    }

    return chunks;
  }

  private splitSentences(text: string): string[] {
    // Split on Arabic sentence terminators: ., ؟, !, ؛
    return text.split(/(?<=[.؟!؛\n])\s+/).filter((s) => s.trim().length > 0);
  }

  private estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters for Arabic
    return Math.ceil(text.length / 4);
  }

  private getOverlapText(text: string, overlapTokens: number): string {
    const words = text.split(' ');
    const approxWords = Math.floor(overlapTokens * 4 / 5);
    return words.slice(-approxWords).join(' ');
  }
}
