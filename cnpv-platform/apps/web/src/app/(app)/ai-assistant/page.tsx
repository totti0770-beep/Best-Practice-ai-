'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { Send, Plus, AlertCircle, CheckCircle, BookOpen } from 'lucide-react';
import { NO_SOURCE_MESSAGE_AR } from '@cnpv/shared-types';

export default function AiAssistantPage() {
  const user = useAuthStore((s) => s.user);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const createSession = async () => {
    const { data } = await api.post('/ai/sessions', { sessionType: 'general' });
    const session = data.data ?? data;
    setSessionId(session.id);
    setMessages([]);
  };

  useEffect(() => {
    createSession();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !sessionId || loading) return;

    const userMsg = { id: Date.now(), role: 'user', contentAr: question };
    setMessages((prev) => [...prev, userMsg]);
    const q = question;
    setQuestion('');
    setLoading(true);

    try {
      const { data } = await api.post(`/ai/sessions/${sessionId}/ask`, { question: q });
      const msg = data.data ?? data;
      setMessages((prev) => [...prev, { ...msg, id: msg.id || Date.now() + 1 }]);
    } catch (err: any) {
      setMessages((prev) => [...prev, {
        id: Date.now() + 1, role: 'assistant',
        noSourceFlag: true,
        contentAr: NO_SOURCE_MESSAGE_AR,
        answerShort: NO_SOURCE_MESSAGE_AR,
        citations: [],
        answerWarnings: [],
        answerSteps: [],
        confidenceLevel: 'none',
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">المساعد التمريضي الذكي</h1>
          <p className="text-sm text-slate-500">إجاباتك مستندة فقط إلى الوثائق المعتمدة</p>
        </div>
        <button
          onClick={createSession}
          className="flex items-center gap-2 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          محادثة جديدة
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <div className="text-5xl mb-4">💬</div>
            <p className="font-medium">ابدأ بطرح سؤالك التمريضي</p>
            <p className="text-sm mt-1">مثال: ما هي جرعة الأموكسيسيلين للأطفال؟</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`message-animate flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'user' ? (
              <div className="max-w-lg bg-blue-600 text-white rounded-2xl rounded-tl-none px-4 py-3 text-sm">
                {msg.contentAr}
              </div>
            ) : (
              <div className={`max-w-2xl rounded-2xl rounded-tr-none p-4 text-sm ${msg.noSourceFlag ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50 border border-slate-200'}`}>
                {msg.noSourceFlag ? (
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-amber-800 font-medium">{msg.answerShort}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="font-semibold text-slate-800">{msg.answerShort}</p>

                    {msg.answerSteps?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 mb-1">الخطوات العملية:</p>
                        <ol className="space-y-1">
                          {msg.answerSteps.map((s: any) => (
                            <li key={s.step} className="flex gap-2">
                              <span className="font-bold text-blue-600 text-xs mt-0.5">{s.step}.</span>
                              <span>{s.text}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {msg.answerWarnings?.length > 0 && (
                      <div className="bg-red-50 rounded-lg px-3 py-2">
                        <p className="text-xs font-semibold text-red-600 mb-1">⚠️ تحذيرات:</p>
                        {msg.answerWarnings.map((w: string, i: number) => (
                          <p key={i} className="text-xs text-red-700">{w}</p>
                        ))}
                      </div>
                    )}

                    {msg.citations?.length > 0 && (
                      <div className="border-t border-slate-200 pt-2">
                        <p className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1">
                          <BookOpen className="w-3 h-3" /> المصادر:
                        </p>
                        {msg.citations.map((c: any, i: number) => (
                          <div key={i} className="text-xs text-slate-600 flex items-center gap-2 mt-1">
                            <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                            <span>{c.documentTitle ?? c.titleAr} — صفحة {c.pageNumber}</span>
                            <span className="text-slate-400">({c.approvedDate})</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <ConfidenceBadge level={msg.confidenceLevel} />
                      {msg.latencyMs && <span className="text-xs text-slate-400">{msg.latencyMs}ms</span>}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start message-animate">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-tr-none px-4 py-3">
              <div className="flex gap-1.5 items-center">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
                <span className="text-xs text-slate-400 mr-2">جارٍ البحث في الوثائق...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="mt-3 flex gap-3">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="اكتب سؤالك التمريضي هنا..."
          className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={!question.trim() || loading}
          className="bg-blue-600 text-white px-5 py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <Send className="w-4.5 h-4.5" />
        </button>
      </form>
    </div>
  );
}

function ConfidenceBadge({ level }: { level: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    high: { label: 'ثقة عالية', cls: 'bg-green-100 text-green-700' },
    medium: { label: 'ثقة متوسطة', cls: 'bg-yellow-100 text-yellow-700' },
    low: { label: 'ثقة منخفضة', cls: 'bg-orange-100 text-orange-700' },
    none: { label: 'لا يوجد مصدر', cls: 'bg-red-100 text-red-700' },
  };
  const item = map[level] ?? map.none;
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.cls}`}>{item.label}</span>;
}
