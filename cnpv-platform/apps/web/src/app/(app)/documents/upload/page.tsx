'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { Upload, FileText, CheckCircle } from 'lucide-react';
import { DocumentCategory } from '@cnpv/shared-types';

const CATEGORIES = [
  { value: DocumentCategory.MEDICATIONS, label: 'الأدوية' },
  { value: DocumentCategory.NURSING_POLICIES, label: 'السياسات التمريضية' },
  { value: DocumentCategory.CBAHI, label: 'معايير CBAHI' },
  { value: DocumentCategory.PROCEDURES, label: 'الإجراءات' },
  { value: DocumentCategory.PROTOCOLS, label: 'البروتوكولات' },
];

export default function UploadDocumentPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    titleAr: '',
    titleEn: '',
    category: '',
    documentNumber: '',
    effectiveDate: '',
    expiryDate: '',
    tags: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setError('يجب اختيار ملف PDF'); return; }
    setError('');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      await api.post('/documents/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess(true);
      setTimeout(() => router.push('/policies'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'فشل رفع الوثيقة');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">تم رفع الوثيقة بنجاح</h2>
        <p className="text-slate-500 mt-2">ستُحوَّل الوثيقة إلى مسار الاعتماد</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <Upload className="w-6 h-6 text-blue-600" />
        رفع وثيقة جديدة
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* File drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files[0];
            if (f?.type === 'application/pdf') setFile(f);
          }}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${dragging ? 'border-blue-400 bg-blue-50' : 'border-slate-300 hover:border-slate-400'}`}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <FileText className="w-8 h-8 text-blue-600" />
              <div className="text-right">
                <p className="font-medium text-slate-800">{file.name}</p>
                <p className="text-sm text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
          ) : (
            <>
              <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <p className="font-medium text-slate-600">اسحب ملف PDF هنا أو انقر للاختيار</p>
              <p className="text-sm text-slate-400 mt-1">PDF فقط — حجم أقصى 50MB</p>
            </>
          )}
          <input id="file-input" type="file" accept=".pdf" className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>

        {/* Metadata */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">عنوان الوثيقة (عربي) *</label>
            <input value={form.titleAr} onChange={(e) => setForm({ ...form, titleAr: e.target.value })}
              required className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="مثال: دليل الأدوية الحرجة" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">فئة الوثيقة *</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              required className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">-- اختر الفئة --</option>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">رقم الوثيقة</label>
              <input value={form.documentNumber} onChange={(e) => setForm({ ...form, documentNumber: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="DOC-2024-001" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">تاريخ الانتهاء</label>
              <input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" dir="ltr" />
            </div>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}

        <button type="submit" disabled={loading || !file || !form.titleAr || !form.category}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50">
          {loading ? 'جارٍ الرفع...' : 'رفع الوثيقة'}
        </button>
      </form>
    </div>
  );
}
