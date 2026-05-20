import { Injectable } from '@nestjs/common';
import { SearchResult } from '../ingestion/vector-store.service';
import { NO_SOURCE_MESSAGE_AR } from '@cnpv/shared-types';

export interface BuiltPrompt {
  systemPrompt: string;
  userMessage: string;
  hasContext: boolean;
}

@Injectable()
export class PromptBuilderService {
  build(question: string, chunks: SearchResultWithMeta[]): BuiltPrompt {
    const hasContext = chunks.length > 0;

    const systemPrompt = `أنت مساعد تمريضي متخصص وموثوق في منصة CNPV لحوكمة المعرفة الصحية.

قواعد صارمة يجب الالتزام بها:
1. أجب فقط بناءً على الوثائق المقدمة في قسم [السياق] أدناه.
2. إذا لم تكن الإجابة موجودة في الوثائق المقدمة، يجب أن ترد بالرسالة التالية حرفياً: "${NO_SOURCE_MESSAGE_AR}"
3. لا تخترع أو تستنتج معلومات طبية غير موجودة في الوثائق.
4. يجب أن تحتوي كل إجابة على citations دقيقة من الوثائق.
5. أجب باللغة العربية دائماً.

شكل الإجابة المطلوب (JSON):
{
  "answerShort": "الإجابة المختصرة والمباشرة",
  "practicalSteps": [{"step": 1, "text": "..."}, ...],
  "warnings": ["تحذير 1", ...],
  "citations": [{"documentTitle": "...", "pageNumber": 0, "approvedDate": "...", "excerpt": "..."}],
  "confidenceLevel": "high|medium|low",
  "noSourceFlag": false
}

إذا لم يوجد مصدر:
{
  "answerShort": "${NO_SOURCE_MESSAGE_AR}",
  "practicalSteps": [],
  "warnings": [],
  "citations": [],
  "confidenceLevel": "none",
  "noSourceFlag": true
}`;

    let userMessage = `السؤال: ${question}\n\n`;

    if (hasContext) {
      userMessage += `[السياق من الوثائق المعتمدة]\n\n`;
      chunks.forEach((chunk, i) => {
        userMessage += `--- وثيقة ${i + 1} ---\n`;
        userMessage += `العنوان: ${chunk.documentTitleAr}\n`;
        userMessage += `الصفحة: ${chunk.pageNumber ?? 'غير محدد'}\n`;
        userMessage += `تاريخ الاعتماد: ${chunk.approvedDate ?? 'غير محدد'}\n`;
        userMessage += `المحتوى:\n${chunk.contentText}\n\n`;
      });
    } else {
      userMessage += `[لا توجد وثائق معتمدة متاحة للإجابة على هذا السؤال]\n`;
    }

    userMessage += `\nأجب بصيغة JSON فقط:`;

    return { systemPrompt, userMessage, hasContext };
  }
}

export interface SearchResultWithMeta extends SearchResult {
  documentTitleAr: string;
  approvedDate: string | null;
}
