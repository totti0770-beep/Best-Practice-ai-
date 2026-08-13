'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { cn } from '@/lib/cn';
import { UserRole } from '@cnpv/shared-types';
import {
  LayoutDashboard, MessageSquare, Pill, Calculator, Shield,
  BookOpen, Upload, CheckSquare, Users, FileText, BarChart2, Settings,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard, roles: null },
  { href: '/ai-assistant', label: 'المساعد التمريضي', icon: MessageSquare, roles: null },
  { href: '/drug-preparation', label: 'تحضير الأدوية', icon: Pill, roles: null },
  { href: '/dose-calculator', label: 'حاسبة الجرعات', icon: Calculator, roles: null },
  { href: '/cbahi', label: 'معايير CBAHI', icon: Shield, roles: null },
  { href: '/policies', label: 'مكتبة السياسات', icon: BookOpen, roles: null },
  {
    href: '/documents/upload', label: 'رفع وثيقة', icon: Upload,
    roles: [UserRole.KNOWLEDGE_MANAGER, UserRole.PHARMACIST_REVIEWER, UserRole.CBAHI_OFFICER, UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN],
  },
  {
    href: '/documents/approval', label: 'اعتماد الوثائق', icon: CheckSquare,
    roles: [UserRole.PHARMACIST_REVIEWER, UserRole.CBAHI_OFFICER, UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN],
  },
  {
    href: '/users', label: 'المستخدمون والأدوار', icon: Users,
    roles: [UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN],
  },
  {
    href: '/audit-logs', label: 'سجل التدقيق', icon: FileText,
    roles: [UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN, UserRole.AUDITOR],
  },
  {
    href: '/analytics', label: 'التحليلات', icon: BarChart2,
    roles: [UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN],
  },
  { href: '/settings', label: 'الإعدادات', icon: Settings, roles: null },
];

export function Sidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const role = user?.role as UserRole;

  const visibleItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(role),
  );

  return (
    <aside className="w-64 bg-white border-l border-slate-200 flex flex-col h-full shadow-sm">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-slate-800 text-sm leading-none">منصة CNPV</p>
            <p className="text-xs text-slate-400 mt-0.5">حوكمة المعرفة</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        {visibleItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800',
              )}
            >
              <item.icon className={cn('w-4.5 h-4.5', active ? 'text-blue-600' : 'text-slate-400')} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User info */}
      <div className="px-4 py-4 border-t border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-slate-600">
              {user?.fullNameAr?.charAt(0) ?? 'م'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-700 truncate">{user?.fullNameAr}</p>
            <p className="text-xs text-slate-400 truncate">{getRoleLabel(role)}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    [UserRole.SUPER_ADMIN]: 'مسؤول عام',
    [UserRole.HOSPITAL_ADMIN]: 'مدير مستشفى',
    [UserRole.KNOWLEDGE_MANAGER]: 'مدير المعرفة',
    [UserRole.PHARMACIST_REVIEWER]: 'صيدلاني مراجع',
    [UserRole.CBAHI_OFFICER]: 'مسؤول CBAHI',
    [UserRole.NURSE]: 'ممرض/ة',
    [UserRole.AUDITOR]: 'مراجع',
  };
  return labels[role] ?? role;
}
