'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { AlertTriangle, CheckCircle, Calculator } from 'lucide-react';

export default function DoseCalculatorPage() {
  const [selectedFormula, setSelectedFormula] = useState<any>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: formulas = [] } = useQuery({
    queryKey: ['dose-formulas'],
    queryFn: () => api.get('/dose-calculator/formulas').then((r) => r.data.data ?? r.data),
  });

  const handleSelectFormula = (formula: any) => {
    setSelectedFormula(formula);
    setVariables({});
    setResult(null);
    setError('');
  };

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const numericVars = Object.fromEntries(
        Object.entries(variables).map(([k, v]) => [k, parseFloat(v)])
      );
      const { data } = await api.post('/dose-calculator/calculate', {
        formulaId: selectedFormula.id,
        variables: numericVars,
      });
      setResult(data.data ?? data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطأ في الحساب');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Calculator className="w-6 h-6 text-blue-600" />
          حاسبة جرعات الأدوية
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          المعادلات المعتمدة فقط من الصيدلاني المراجع أو المصادر المعتمدة
        </p>
      </div>

      {/* Formula selection */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-700 mb-3">اختر الدواء</h2>
        <div className="grid grid-cols-2 gap-2">
          {(formulas as any[]).map((f: any) => (
            <button
              key={f.id}
              onClick={() => handleSelectFormula(f)}
              className={`text-right px-4 py-3 rounded-lg border text-sm transition-all ${
                selectedFormula?.id === f.id
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <p className="font-medium">{f.drugNameAr}</p>
              {f.drugNameEn && <p className="text-xs text-slate-400">{f.drugNameEn}</p>}
            </button>
          ))}
        </div>
        {formulas.length === 0 && (
          <p className="text-slate-400 text-sm text-center py-4">لا توجد معادلات متاحة بعد</p>
        )}
      </div>

      {/* Variables input */}
      {selectedFormula && (
        <form onSubmit={handleCalculate} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="font-semibold text-slate-700">أدخل البيانات</h2>
          {selectedFormula.formulaVariables?.map((v: any) => (
            <div key={v.name}>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {v.labelAr} {v.unit && <span className="text-slate-400">({v.unit})</span>}
                {v.min !== undefined && v.max !== undefined && (
                  <span className="text-xs text-slate-400 mr-1">
                    [{v.min} — {v.max}]
                  </span>
                )}
              </label>
              <input
                type="number"
                step="any"
                value={variables[v.name] ?? ''}
                onChange={(e) => setVariables((prev) => ({ ...prev, [v.name]: e.target.value }))}
                required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                dir="ltr"
              />
            </div>
          ))}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'جارٍ الحساب...' : 'احسب الجرعة'}
          </button>
        </form>
      )}

      {/* Result */}
      {result && (
        <div className={`bg-white rounded-xl border-2 p-5 ${result.withinSafeRange ? 'border-green-300' : 'border-red-300'}`}>
          <div className="flex items-center gap-2 mb-4">
            {result.withinSafeRange ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-500" />
            )}
            <h3 className="font-bold text-slate-800">نتيجة الحساب — {result.drugNameAr}</h3>
          </div>

          <div className="text-center my-6">
            <span className="text-5xl font-bold text-blue-700">{result.result}</span>
            <span className="text-xl text-slate-500 mr-2">{result.unit}</span>
          </div>

          {result.minDose && result.maxDose && (
            <p className="text-sm text-slate-500 text-center mb-4">
              النطاق الآمن: {result.minDose} — {result.maxDose} {result.unit}
            </p>
          )}

          {/* Safety warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
            <p className="text-sm text-amber-800 font-medium">⚠️ {result.warning}</p>
          </div>
        </div>
      )}
    </div>
  );
}
