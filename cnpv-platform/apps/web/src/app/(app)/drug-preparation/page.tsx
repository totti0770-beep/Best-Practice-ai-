'use client';

import { useState, useRef, useEffect } from 'react';
import { api } from '@/lib/api-client';
import { Send, AlertCircle, BookOpen, CheckCircle } from 'lucide-react';
import { NO_SOURCE_MESSAGE_AR } from '@cnpv/shared-types';

export default function DrugPreparationPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.post('/ai/sessions', { sessionType: 'drug_prep' })
      .then(({ data }) => setSessionId((data.data ?? data).id));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !sessionId || loading) return;
    const q = question;
    setMessages((prev) => [...prev, { id: Date.now(), role: 'user', contentAr: q }]);
    setQuestion('');
    setLoading(true);
    try {
      const { data } = await api.post(`/ai/sessions/${sessionId}/ask`, {
        question: q,
        category: 'medications',
      });
      setMessages((prev) => [...prev, { ...(data.data ?? data), id: Date.now() + 1 }]);
    } catch {
      setMessages((prev) => [...prev, {
        id: Date.now() + 1, role: 'assistant', noSourceFlag: true,
        answerShort: NO_SOURCE_MESSAGE_AR, citations: [], answerWarnings: [], answerSteps: [],
        confidenceLevel: 'none',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const quickQuestions = [
    'كيف يتم تحضير محلول الكلوريد الصوديوم 0.9%؟',
    'ما هو نظام تحضير الهيبارين بالمضخة؟',
    'كيف يتم تخفيف الأمبيسيلين للحقن الوريدي؟',
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-slate-800">💊 مساعد تحضير الأدوية</h1>
        <p className="text-sm text-slate-500">إرشادات التحضير من الوثائق الصيدلانية المعتمدة فقط</p>
      </div>

      {messages.length === 0 && (
        <div className="mb-4">
          <p className="text-xs text-slate-400 mb-2">أسئلة شائعة:</p>
          <div className="flex flex-wrap gap-2">
            {quickQuestions.map((q) => (
              <button key={q} onClick={() => setQuestion(q)}
                className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors">
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 bg-white rounded-2xl border border-slate-200 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`message-animate flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'user' ? (
              <div className="max-w-lg bg-blue-600 text-white rounded-2xl rounded-tl-none px-4 py-3 text-sm">{msg.contentAr}</div>
            ) : (
              <div className={`max-w-2xl rounded-2xl rounded-tr-none p-4 text-sm ${msg.noSourceFlag ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50 border border-slate-200'}`}>
                {msg.noSourceFlag ? (
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    <p className="text-amber-800 font-medium">{msg.answerShort}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="font-semibold text-slate-800">{msg.answerShort}</p>
                    {msg.answerSteps?.length > 0 && (
                      <ol className="space-y-1">
                        {msg.answerSteps.map((s: any) => (
                          <li key={s.step} className="flex gap-2 text-sm">
                            <span className="font-bold text-blue-600 text-xs mt-0.5">{s.step}.</span>
                            <span>{s.text}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                    {msg.answerWarnings?.length > 0 && (
                      <div className="bg-red-50 rounded-lg px-3 py-2">
                        {msg.answerWarnings.map((w: string, i: number) => (
                          <p key={i} className="text-xs text-red-700">⚠️ {w}</p>
                        ))}
                      </div>
                    )}
                    {msg.citations?.length > 0 && (
                      <div className="border-t pt-2 space-y-1">
                        {msg.citations.map((c: any, i: number) => (
                          <div key={i} className="text-xs text-slate-500 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-green-500" />
                            {c.documentTitle ?? c.titleAr} — ص{c.pageNumber}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="mt-3 flex gap-3">
        <input value={question} onChange={(e) => setQuestion(e.target.value)}
          placeholder="اسأل عن تحضير دواء..."
          className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading} />
        <button type="submit" disabled={!question.trim() || loading}
          className="bg-blue-600 text-white px-5 py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50">
          <Send className="w-4.5 h-4.5" />
        </button>
      </form>
    </div>
  );
}
