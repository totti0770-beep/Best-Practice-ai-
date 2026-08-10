'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { FileText, Search } from 'lucide-react';

export default function AuditLogsPage() {
  const [eventType, setEventType] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', eventType, page],
    queryFn: () =>
      api.get('/audit', { params: { eventType, page, limit: 30 } })
        .then((r) => r.data.data ?? r.data),
    keepPreviousData: true,
  } as any);

  const logs = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            سجل التدقيق
          </h1>
          <p className="text-slate-500 text-sm mt-1">جميع الأحداث موثقة ومؤرشفة</p>
        </div>
      </div>

      <div className="flex gap-3">
        <input value={eventType} onChange={(e) => { setEventType(e.target.value); setPage(1); }}
          placeholder="فلترة بنوع الحدث (مثل: DOCUMENT_APPROVED)"
          className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          dir="ltr" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-right px-4 py-3 font-semibold text-slate-600">نوع الحدث</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-600">المستخدم</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-600">الكيان</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-600">الوقت</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-600">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-100">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3 bg-slate-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : logs.map((log: any) => (
              <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                    {log.eventType}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{log.userEmail ?? '—'}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{log.entityType ?? '—'}</td>
                <td className="px-4 py-3 text-slate-400 text-xs dir-ltr">
                  {new Date(log.createdAt).toLocaleString('ar-SA')}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${log.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {log.success ? 'نجاح' : 'فشل'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && !isLoading && (
          <p className="text-center py-10 text-slate-400">لا توجد سجلات</p>
        )}
      </div>

      <div className="flex justify-center gap-2">
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
          className="px-4 py-2 border rounded-lg text-sm disabled:opacity-40">السابق</button>
        <span className="px-4 py-2 text-sm text-slate-500">صفحة {page}</span>
        <button onClick={() => setPage((p) => p + 1)} disabled={logs.length < 30}
          className="px-4 py-2 border rounded-lg text-sm disabled:opacity-40">التالي</button>
      </div>
    </div>
  );
}
