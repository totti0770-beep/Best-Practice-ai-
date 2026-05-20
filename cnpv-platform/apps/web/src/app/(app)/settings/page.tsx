'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api-client';
import { Settings, Shield, User, QrCode } from 'lucide-react';

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const [qrCode, setQrCode] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaStep, setMfaStep] = useState<'idle' | 'setup' | 'verify'>('idle');
  const [success, setSuccess] = useState('');

  const handleSetupMfa = async () => {
    const { data } = await api.post('/auth/mfa/setup');
    const result = data.data ?? data;
    setQrCode(result.qrCode);
    setMfaStep('setup');
  };

  const handleEnableMfa = async () => {
    await api.post('/auth/mfa/enable', { code: mfaCode });
    setSuccess('تم تفعيل التحقق بخطوتين بنجاح');
    setMfaStep('idle');
    setQrCode('');
    setMfaCode('');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
        <Settings className="w-6 h-6 text-blue-600" />
        الإعدادات
      </h1>

      {/* Profile info */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-700 flex items-center gap-2 mb-4">
          <User className="w-4 h-4" />
          معلومات الحساب
        </h2>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">الاسم</span>
            <span className="font-medium text-slate-800">{user?.fullNameAr}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">البريد الإلكتروني</span>
            <span className="font-medium text-slate-800" dir="ltr">{user?.email}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">الدور</span>
            <span className="font-medium text-slate-800">{user?.role}</span>
          </div>
        </div>
      </div>

      {/* MFA setup */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-700 flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4" />
          التحقق بخطوتين (MFA)
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          {user?.isMfaEnabled ? '✅ التحقق بخطوتين مفعّل' : 'يوصى بتفعيل التحقق بخطوتين للمسؤولين'}
        </p>

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 mb-4">
            {success}
          </div>
        )}

        {mfaStep === 'idle' && !user?.isMfaEnabled && (
          <button onClick={handleSetupMfa}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            إعداد التحقق بخطوتين
          </button>
        )}

        {mfaStep === 'setup' && qrCode && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">امسح رمز QR باستخدام تطبيق Google Authenticator أو Authy:</p>
            <img src={qrCode} alt="QR Code" className="w-48 h-48 border border-slate-200 rounded-lg" />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                أدخل الرمز للتحقق
              </label>
              <input value={mfaCode} onChange={(e) => setMfaCode(e.target.value)}
                maxLength={6} placeholder="000000"
                className="w-32 px-3 py-2 border border-slate-200 rounded-lg text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
                dir="ltr" />
            </div>
            <button onClick={handleEnableMfa} disabled={mfaCode.length < 6}
              className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
              تفعيل
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
