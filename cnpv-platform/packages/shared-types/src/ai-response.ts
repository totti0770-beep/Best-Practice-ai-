export interface Citation {
  documentId: string;
  titleAr: string;
  pageNumber: number;
  approvedDate: string;
  chunkExcerpt: string;
}

export interface PracticalStep {
  step: number;
  text: string;
}

export enum ConfidenceLevel {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  NONE = 'none',
}

export interface AiAnswer {
  messageId: string;
  role: 'assistant';
  answerShort: string;
  practicalSteps: PracticalStep[];
  warnings: string[];
  citations: Citation[];
  confidenceLevel: ConfidenceLevel;
  noSourceFlag: boolean;
  latencyMs?: number;
}

export const NO_SOURCE_MESSAGE_AR =
  'لا توجد وثيقة معتمدة كافية للإجابة. الرجاء الرجوع للمسؤول المختص.';
