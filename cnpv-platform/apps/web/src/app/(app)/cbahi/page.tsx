'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Search, Shield } from 'lucide-react';

export default function CbahiPage() {
  const [question, setQuestion] = useState('');
  const [submittedQ, setSubmittedQ] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [answer, setAnswer] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setSubmittedQ(question);
    try {
      let sid = sessionId;
      if (!sid) {
        const { data } = await api.post('/ai/sessions', { sessionType: 'cbahi' });
        sid = (data.data ?? data).id;
        setSessionId(sid);
      }
      const { data } = await api.post(`/ai/sessions/${sid}/ask`, {
        question,
        category: 'cbahi',
      });
      setAnswer(data.data ?? data);
    } catch {
      setAnswer({ noSourceFlag: true, answerShort: 'لا توجد وثيقة معتمدة كافية للإجابة. الرجاء الرجوع للمسؤول المختص.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Shield className="w-6 h-6 text-blue-600" />
          معايير CBAHI / سباهي
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          استعلام فوري عن معايير اعتماد المستشفيات السعودية من الوثائق المعتمدة
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="مثال: ما هي متطلبات CBAHI لمنع العدوى في وحدة العناية المركزة؟"
            className="w-full pr-10 pl-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button type="submit" disabled={!question.trim() || loading}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 font-medium text-sm">
          {loading ? '...' : 'بحث'}
        </button>
      </form>

      {answer && (
        <div className={`bg-white rounded-xl border p-5 ${answer.noSourceFlag ? 'border-amber-300' : 'border-green-300'}`}>
          {answer.noSourceFlag ? (
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <p className="text-amber-800 font-medium">{answer.answerShort}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-800">إجابة من معايير CBAHI</h3>
              </div>
              <p className="text-slate-700">{answer.answerShort}</p>
              {answer.answerSteps?.length > 0 && (
                <ol className="space-y-2 bg-slate-50 rounded-lg p-4">
                  {answer.answerSteps.map((s: any) => (
                    <li key={s.step} className="flex gap-3 text-sm">
                      <span className="font-bold text-blue-600 w-5 flex-shrink-0">{s.step}.</span>
                      <span>{s.text}</span>
                    </li>
                  ))}
                </ol>
              )}
              {answer.citations?.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-blue-700 mb-2">📚 مصادر المعلومات:</p>
                  {answer.citations.map((c: any, i: number) => (
                    <p key={i} className="text-xs text-blue-600">
                      {c.documentTitle ?? c.titleAr} — صفحة {c.pageNumber} — ({c.approvedDate})
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
