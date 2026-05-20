'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { FileText, Users, MessageSquare, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data: overview } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => api.get('/analytics/overview').then((r) => r.data.data),
    enabled: ['hospital_admin', 'super_admin'].includes(user?.role ?? ''),
  });

  const stats = overview ?? {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          أهلاً، {user?.fullNameAr} 👋
        </h1>
        <p className="text-slate-500 mt-1">مرحباً بك في منصة CNPV لحوكمة المعرفة التمريضية</p>
      </div>

      {/* KPI Cards */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={FileText} label="وثائق نشطة" value={stats.activeDocs ?? 0} color="blue" />
          <StatCard icon={Clock} label="قيد المراجعة" value={stats.pendingDocs ?? 0} color="amber" />
          <StatCard icon={AlertTriangle} label="تنتهي قريباً" value={stats.expiringSoon ?? 0} color="red" />
          <StatCard icon={MessageSquare} label="استفسارات AI" value={stats.totalAiQueries ?? 0} color="green" />
        </div>
      )}

      {/* Quick actions */}
      <div>
        <h2 className="text-lg font-semibold text-slate-700 mb-4">الإجراءات السريعة</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <QuickAction href="/ai-assistant" icon="🤖" title="سؤال تمريضي" desc="اسأل المساعد الذكي" />
          <QuickAction href="/dose-calculator" icon="💊" title="احسب جرعة" desc="حاسبة الجرعات الدوائية" />
          <QuickAction href="/policies" icon="📋" title="مكتبة السياسات" desc="تصفح الوثائق المعتمدة" />
          <QuickAction href="/cbahi" icon="🏅" title="معايير CBAHI" desc="استعلام معايير الجودة" />
          <QuickAction href="/drug-preparation" icon="🧪" title="تحضير الأدوية" desc="إرشادات التحضير" />
          <QuickAction href="/documents/upload" icon="📤" title="رفع وثيقة" desc="إضافة وثيقة جديدة" />
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: any) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    green: 'bg-green-50 text-green-700 border-green-200',
  };

  return (
    <div className={`rounded-xl border p-5 ${colors[color]}`}>
      <Icon className="w-5 h-5 mb-3 opacity-70" />
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm mt-1 opacity-80">{label}</p>
    </div>
  );
}

function QuickAction({ href, icon, title, desc }: any) {
  return (
    <a href={href} className="block bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all">
      <div className="text-2xl mb-2">{icon}</div>
      <p className="font-semibold text-slate-700 text-sm">{title}</p>
      <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
    </a>
  );
}
