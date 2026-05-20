'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed'];
const CATEGORY_LABELS: Record<string, string> = {
  medications: 'الأدوية',
  nursing_policies: 'السياسات التمريضية',
  cbahi: 'CBAHI',
  procedures: 'الإجراءات',
  protocols: 'البروتوكولات',
};

export default function AnalyticsPage() {
  const { data: overview } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => api.get('/analytics/overview').then((r) => r.data.data ?? r.data),
  });

  const { data: statusData } = useQuery({
    queryKey: ['analytics-by-status'],
    queryFn: () => api.get('/analytics/documents/by-status').then((r) => r.data.data ?? r.data),
  });

  const { data: categoryData } = useQuery({
    queryKey: ['analytics-by-category'],
    queryFn: () => api.get('/analytics/documents/by-category').then((r) => r.data.data ?? r.data),
  });

  const { data: aiUsage } = useQuery({
    queryKey: ['analytics-ai-usage'],
    queryFn: () => api.get('/analytics/ai/usage').then((r) => r.data.data ?? r.data),
  });

  const STATUS_LABELS: Record<string, string> = {
    draft: 'مسودة', under_review: 'مراجعة', approved: 'معتمدة',
    indexed: 'مفهرسة', active: 'نشطة', expired: 'منتهية', rejected: 'مرفوضة',
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">التحليلات والإحصائيات</h1>

      {/* Overview KPIs */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'وثائق نشطة', value: overview.activeDocs, color: 'text-blue-600' },
            { label: 'إجمالي المستخدمين', value: overview.totalUsers, color: 'text-green-600' },
            { label: 'استفسارات AI', value: overview.totalAiQueries, color: 'text-purple-600' },
            { label: 'معدل عدم المصدر', value: `${overview.noSourceRate}%`, color: 'text-amber-600' },
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-xl border border-slate-200 p-5">
              <p className={`text-3xl font-bold ${item.color}`}>{item.value}</p>
              <p className="text-sm text-slate-500 mt-1">{item.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document status chart */}
        {statusData && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-700 mb-4">الوثائق حسب الحالة</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={(statusData as any[]).map((d: any) => ({
                name: STATUS_LABELS[d.status] ?? d.status,
                count: parseInt(d.count),
              }))}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Category pie chart */}
        {categoryData && (categoryData as any[]).length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-700 mb-4">الوثائق النشطة حسب الفئة</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={(categoryData as any[]).map((d: any) => ({
                  name: CATEGORY_LABELS[d.category] ?? d.category,
                  value: parseInt(d.count),
                }))} cx="50%" cy="50%" outerRadius={80} dataKey="value" label>
                  {(categoryData as any[]).map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* AI usage chart */}
      {aiUsage && (aiUsage as any[]).length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-700 mb-4">استفسارات AI — آخر 30 يوم</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={(aiUsage as any[]).map((d: any) => ({
              date: d.date,
              count: parseInt(d.query_count),
            }))}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
