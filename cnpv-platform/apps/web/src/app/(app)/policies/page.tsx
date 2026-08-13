'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Search, FileText, Calendar, Tag } from 'lucide-react';
import { DocumentCategory, DocumentStatus } from '@cnpv/shared-types';

const CATEGORY_LABELS: Record<string, string> = {
  medications: 'الأدوية',
  nursing_policies: 'السياسات التمريضية',
  cbahi: 'معايير CBAHI',
  procedures: 'الإجراءات',
  protocols: 'البروتوكولات',
};

export default function PoliciesPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['documents', search, category, page],
    queryFn: () =>
      api.get('/documents', {
        params: { search, category, status: DocumentStatus.ACTIVE, page, limit: 12 },
      }).then((r) => r.data.data ?? r.data),
    keepPreviousData: true,
  } as any);

  const docs = data?.data ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">مكتبة السياسات والوثائق</h1>
        <p className="text-slate-500 text-sm mt-1">الوثائق المعتمدة المتاحة للاستعراض</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="ابحث عن وثيقة..."
            className="w-full pr-10 pl-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">جميع الفئات</option>
          {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {/* Documents grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-3" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {docs.map((doc: any) => (
            <DocumentCard key={doc.id} doc={doc} />
          ))}
        </div>
      )}

      {docs.length === 0 && !isLoading && (
        <div className="text-center py-16 text-slate-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>لا توجد وثائق مطابقة للبحث</p>
        </div>
      )}

      {/* Pagination */}
      {total > 12 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="px-4 py-2 border rounded-lg text-sm disabled:opacity-40">السابق</button>
          <span className="px-4 py-2 text-sm text-slate-500">صفحة {page}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={docs.length < 12}
            className="px-4 py-2 border rounded-lg text-sm disabled:opacity-40">التالي</button>
        </div>
      )}
    </div>
  );
}

function DocumentCard({ doc }: { doc: any }) {
  const handleView = async () => {
    const { data } = await api.get(`/documents/${doc.id}/view`);
    const url = data.data ?? data;
    window.open(typeof url === 'string' ? url : url.url, '_blank');
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-3">
        <FileText className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
          {CATEGORY_LABELS[doc.category] ?? doc.category}
        </span>
      </div>
      <h3 className="font-semibold text-slate-800 mt-3 text-sm leading-snug">{doc.titleAr}</h3>
      {doc.documentNumber && (
        <p className="text-xs text-slate-400 mt-1">رقم: {doc.documentNumber}</p>
      )}
      <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {doc.effectiveDate ?? doc.createdAt?.split('T')[0]}
        </span>
        {doc.expiryDate && (
          <span className="text-amber-500">تنتهي: {doc.expiryDate}</span>
        )}
      </div>
      <button
        onClick={handleView}
        className="mt-4 w-full text-center text-xs text-blue-600 hover:text-blue-700 font-medium border border-blue-200 rounded-lg py-1.5 hover:bg-blue-50 transition-colors"
      >
        استعراض الوثيقة
      </button>
    </div>
  );
}
