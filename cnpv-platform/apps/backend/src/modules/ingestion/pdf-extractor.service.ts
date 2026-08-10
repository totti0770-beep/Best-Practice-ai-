import { Injectable, Logger } from '@nestjs/common';
// @ts-ignore
import * as pdfParse from 'pdf-parse';

export interface ExtractedPdf {
  text: string;
  numPages: number;
  pageTexts: string[];
}

@Injectable()
export class PdfExtractorService {
  private readonly logger = new Logger(PdfExtractorService.name);

  async extract(buffer: Buffer): Promise<ExtractedPdf> {
    const pageTexts: string[] = [];

    const data = await pdfParse(buffer, {
      pagerender: (pageData: any) => {
        return pageData.getTextContent().then((textContent: any) => {
          const text = textContent.items.map((item: any) => item.str).join(' ');
          pageTexts.push(text);
          return text;
        });
      },
    });

    // Normalize Arabic text
    const normalizedText = this.normalizeArabic(data.text);
    const normalizedPages = pageTexts.map((p) => this.normalizeArabic(p));

    this.logger.log(`Extracted ${data.numpages} pages, ${normalizedText.length} chars`);

    return {
      text: normalizedText,
      numPages: data.numpages,
      pageTexts: normalizedPages.length > 0 ? normalizedPages : [normalizedText],
    };
  }

  private normalizeArabic(text: string): string {
    return text
      // Remove diacritics (tashkeel)
      .replace(/[ؐ-ًؚ-ٟ]/g, '')
      // Normalize Alef variants to bare Alef
      .replace(/[أإآ]/g, 'ا')
      // Normalize Teh Marbuta
      .replace(/ة/g, 'ه')
      // Remove tatweel
      .replace(/ـ/g, '')
      // Collapse multiple spaces
      .replace(/\s+/g, ' ')
      .trim();
  }
}
