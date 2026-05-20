'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Users, UserCheck, UserX, Shield } from 'lucide-react';
import { UserRole } from '@cnpv/shared-types';
import { useState } from 'react';

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'مسؤول عام',
  hospital_admin: 'مدير مستشفى',
  knowledge_manager: 'مدير المعرفة',
  pharmacist_reviewer: 'صيدلاني مراجع',
  cbahi_officer: 'مسؤول CBAHI',
  nurse: 'ممرض/ة',
  auditor: 'مراجع',
};

export default function UsersPage() {
  const qc = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    fullNameAr: '', email: '', role: UserRole.NURSE, department: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data.data ?? r.data),
  });
  const users = data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (body: any) => api.post('/users', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setShowInvite(false); },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            المستخدمون والأدوار
          </h1>
          <p className="text-slate-500 text-sm mt-1">إدارة صلاحيات فريق العمل</p>
        </div>
        <button onClick={() => setShowInvite(!showInvite)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          + إضافة مستخدم
        </button>
      </div>

      {showInvite && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h3 className="font-semibold text-slate-700">دعوة مستخدم جديد</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">الاسم (عربي)</label>
              <input value={inviteForm.fullNameAr} onChange={(e) => setInviteForm({ ...inviteForm, fullNameAr: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">البريد الإلكتروني</label>
              <input type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                dir="ltr" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">الدور</label>
              <select value={inviteForm.role} onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as UserRole })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">القسم</label>
              <input value={inviteForm.department} onChange={(e) => setInviteForm({ ...inviteForm, department: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => createMutation.mutate(inviteForm)}
              disabled={!inviteForm.fullNameAr || !inviteForm.email}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              إضافة
            </button>
            <button onClick={() => setShowInvite(false)}
              className="px-5 py-2 text-slate-500 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">
              إلغاء
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-right px-5 py-3 font-semibold text-slate-600">المستخدم</th>
              <th className="text-right px-5 py-3 font-semibold text-slate-600">الدور</th>
              <th className="text-right px-5 py-3 font-semibold text-slate-600">القسم</th>
              <th className="text-right px-5 py-3 font-semibold text-slate-600">الحالة</th>
              <th className="text-right px-5 py-3 font-semibold text-slate-600">إجراء</th>
            </tr>
          </thead>
          <tbody>
            {(users as any[]).map((u: any) => (
              <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-5 py-3">
                  <p className="font-medium text-slate-800">{u.fullNameAr}</p>
                  <p className="text-xs text-slate-400" dir="ltr">{u.email}</p>
                </td>
                <td className="px-5 py-3">
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                    {ROLE_LABELS[u.role] ?? u.role}
                  </span>
                </td>
                <td className="px-5 py-3 text-slate-500">{u.department ?? '—'}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {u.isActive ? 'نشط' : 'معطّل'}
                  </span>
                  {u.isMfaEnabled && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full mr-1">
                      MFA
                    </span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <button onClick={() => deactivateMutation.mutate(u.id)}
                    className="text-xs text-red-500 hover:text-red-700">
                    تعطيل
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && !isLoading && (
          <p className="text-center py-10 text-slate-400">لا يوجد مستخدمون</p>
        )}
      </div>
    </div>
  );
}
