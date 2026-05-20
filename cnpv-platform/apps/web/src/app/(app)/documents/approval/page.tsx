'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { DocumentStatus } from '@cnpv/shared-types';
import { useAuthStore } from '@/lib/auth-store';
import { useState } from 'react';
import { CheckCircle, XCircle, ArrowRight, Clock } from 'lucide-react';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'مسودة', color: 'bg-slate-100 text-slate-600' },
  under_review: { label: 'قيد المراجعة', color: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'معتمدة', color: 'bg-blue-100 text-blue-700' },
  indexed: { label: 'مفهرسة', color: 'bg-purple-100 text-purple-700' },
  active: { label: 'نشطة', color: 'bg-green-100 text-green-700' },
  expired: { label: 'منتهية', color: 'bg-red-100 text-red-700' },
  rejected: { label: 'مرفوضة', color: 'bg-red-100 text-red-600' },
};

export default function ApprovalPage() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['docs-pending'],
    queryFn: () =>
      api.get('/documents', { params: { status: 'under_review', limit: 50 } })
        .then((r) => r.data.data ?? r.data),
  });

  const docs = data?.data ?? [];

  const mutate = useMutation({
    mutationFn: ({ id, action, notes }: any) =>
      api.post(`/documents/${id}/${action}`, { notes }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['docs-pending'] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">سير اعتماد الوثائق</h1>
        <p className="text-slate-500 text-sm mt-1">الوثائق المنتظرة للمراجعة والاعتماد</p>
      </div>

      {/* Workflow steps visual */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-1 text-xs text-slate-500 flex-wrap">
          {['مسودة', 'قيد المراجعة', 'معتمدة', 'مفهرسة', 'نشطة'].map((step, i, arr) => (
            <div key={step} className="flex items-center gap-1">
              <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded">{step}</span>
              {i < arr.length - 1 && <ArrowRight className="w-3 h-3 text-slate-300" />}
            </div>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-400">جارٍ التحميل...</div>
      ) : docs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">لا توجد وثائق تنتظر المراجعة</p>
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map((doc: any) => (
            <div key={doc.id} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_LABELS[doc.status]?.color}`}>
                      {STATUS_LABELS[doc.status]?.label}
                    </span>
                    <span className="text-xs text-slate-400">{doc.category}</span>
                  </div>
                  <h3 className="font-semibold text-slate-800">{doc.titleAr}</h3>
                  {doc.documentNumber && <p className="text-xs text-slate-400 mt-0.5">{doc.documentNumber}</p>}
                  <p className="text-xs text-slate-400 mt-1">
                    رُفعت في: {new Date(doc.createdAt).toLocaleDateString('ar-SA')}
                  </p>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => mutate.mutate({ id: doc.id, action: 'approve' })}
                    className="flex items-center gap-1 text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700"
                  >
                    <CheckCircle className="w-3 h-3" /> اعتماد
                  </button>
                  <button
                    onClick={() => setRejectingId(doc.id)}
                    className="flex items-center gap-1 text-xs bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100"
                  >
                    <XCircle className="w-3 h-3" /> رفض
                  </button>
                </div>
              </div>

              {/* Reject reason input */}
              {rejectingId === doc.id && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <input
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="سبب الرفض (مطلوب)"
                    className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 mb-2"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (!rejectReason.trim()) return;
                        mutate.mutate({ id: doc.id, action: 'reject', notes: rejectReason });
                        setRejectingId(null);
                        setRejectReason('');
                      }}
                      className="text-xs bg-red-600 text-white px-4 py-1.5 rounded-lg hover:bg-red-700"
                    >تأكيد الرفض</button>
                    <button onClick={() => setRejectingId(null)}
                      className="text-xs text-slate-500 px-4 py-1.5 rounded-lg hover:bg-slate-50">إلغاء</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
