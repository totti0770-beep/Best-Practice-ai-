'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Shield, AlertTriangle, ChevronLeft, CheckCircle, BookOpen, Brain, Calculator, Users, FileText, Lock } from 'lucide-react';

export default function LandingPage() {
  const [warningDismissed, setWarningDismissed] = useState(false);

  return (
    <div className="min-h-screen bg-[#0f1e3d] font-arabic" dir="rtl">

      {/* ── Safety Warning Banner ── */}
      {!warningDismissed && (
        <div className="bg-amber-500 text-amber-950 px-4 py-3 flex items-start gap-3 relative">
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
          <div className="flex-1 text-sm leading-relaxed">
            <span className="font-bold">تحذير سريري مهم: </span>
            هذه المنصة أداة مساعدة للقرار فقط. جميع الإجابات مستندة حصراً إلى وثائق معتمدة مرفوعة من إدارتك.{' '}
            <strong>لا تُعدّ بديلاً عن الحكم السريري للطبيب أو الممرض المختص.</strong>{' '}
            في الحالات الطارئة، اتبع بروتوكولات المستشفى فوراً.
          </div>
          <button
            onClick={() => setWarningDismissed(true)}
            className="shrink-0 text-amber-800 hover:text-amber-950 text-lg leading-none font-bold px-1"
            aria-label="إغلاق"
          >
            ×
          </button>
        </div>
      )}

      {/* ── Top Nav ── */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-cyan-500 rounded-full flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="text-right">
            <div className="text-white font-bold text-sm leading-tight">منصة CNPV</div>
            <div className="text-cyan-400 text-xs leading-tight">حوكمة المعرفة الموثقة</div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-6 text-sm text-slate-300">
          <a href="#features" className="hover:text-white transition-colors">المزايا</a>
          <a href="#workflow" className="hover:text-white transition-colors">كيف تعمل</a>
          <a href="#safety" className="hover:text-white transition-colors">الأمان</a>
        </nav>

        {/* Auth buttons */}
        <div className="flex items-center gap-3">
          <Link
            href="/(auth)/login"
            className="text-slate-300 hover:text-white text-sm transition-colors"
          >
            تسجيل الدخول
          </Link>
          <Link
            href="/(auth)/login"
            className="bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-semibold px-5 py-2 rounded-full flex items-center gap-2 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            ابدأ الآن
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="px-6 pt-16 pb-12 text-center max-w-3xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm text-slate-300 mb-8">
          <span className="text-cyan-400 font-semibold">CNPV</span>
          — Certified Nursing Practice & Knowledge Vault
          <span className="text-cyan-400">✦</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
          <span className="text-white">منصة حوكمة المعرفة</span>
          <br />
          <span className="text-cyan-400">والقرار الموثق للقطاع</span>
          <br />
          <span className="text-white">الصحي</span>
        </h1>

        {/* Value prop card */}
        <div className="bg-white/8 border border-white/15 rounded-2xl px-6 py-5 mb-8 text-right">
          <p className="text-slate-200 text-base leading-relaxed">
            <span className="text-cyan-400 font-bold">CNPV</span> ليس مجرد AI يجيب…
            بل منصة حوكمة تضمن أن القرار مبني على{' '}
            <strong className="text-white">معرفة موثقة</strong> —
            أو <strong className="text-white">لا تصدر إجابة إطلاقاً.</strong>
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/(auth)/login"
            className="bg-white hover:bg-slate-100 text-[#0f1e3d] font-bold px-8 py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors text-base"
          >
            استعرض رحلة القرار الموثق
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <Link
            href="/(auth)/login"
            className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-8 py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors text-base"
          >
            ابدأ تجربة المساعد الذكي
            <Brain className="w-5 h-5 text-cyan-400" />
          </Link>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="px-6 pb-14">
        <div className="max-w-3xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { value: '80%–', label: 'تقليل البحث اليدوي', color: 'text-cyan-400' },
            { value: '70%–', label: 'زمن الوصول للمعلومة', color: 'text-cyan-400' },
            { value: '100%', label: 'إجابات موثقة فقط', color: 'text-emerald-400' },
            { value: '0%', label: 'هلوسة AI', color: 'text-emerald-400' },
          ].map((s) => (
            <div key={s.label} className="bg-white/8 border border-white/10 rounded-2xl p-5 text-center">
              <div className={`text-3xl font-bold ${s.color} mb-1`}>{s.value}</div>
              <div className="text-slate-400 text-xs leading-snug">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Safety Section ── */}
      <section id="safety" className="px-6 py-12 bg-red-950/30 border-y border-red-900/40">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-6 justify-center">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <h2 className="text-white text-xl font-bold">تحذيرات السلامة السريرية</h2>
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                icon: '⚠️',
                title: 'أداة مساعدة لا بديل',
                text: 'المنصة تدعم قرارك السريري ولا تحل محل خبرتك. القرار النهائي دائماً للمختص الصحي.',
              },
              {
                icon: '📋',
                title: 'مصادر معتمدة فقط',
                text: 'كل إجابة مستندة حصراً إلى وثائق PDF معتمدة ومفعّلة. إن لم يوجد مصدر، المنصة لا تُجيب.',
              },
              {
                icon: '🚨',
                title: 'الحالات الطارئة',
                text: 'في الحالات الحرجة والطوارئ، اتبع بروتوكولات المستشفى المعتمدة فوراً دون الرجوع للمنصة.',
              },
              {
                icon: '📅',
                title: 'صلاحية الوثائق',
                text: 'تحقق دائماً من تاريخ اعتماد الوثيقة المستشهد بها. الوثائق المنتهية تُزال تلقائياً من المنصة.',
              },
            ].map((item) => (
              <div key={item.title} className="bg-red-950/40 border border-red-900/50 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl shrink-0">{item.icon}</span>
                  <div>
                    <div className="text-white font-semibold text-sm mb-1">{item.title}</div>
                    <div className="text-slate-400 text-xs leading-relaxed">{item.text}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-slate-500 text-xs mt-6">
            باستخدامك للمنصة، تقر بأنك مختص صحي مُرخَّص وأن القرار السريري مسؤوليتك الكاملة.
          </p>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-white text-2xl font-bold text-center mb-2">ماذا تقدم المنصة؟</h2>
          <p className="text-slate-400 text-center text-sm mb-10">ست وحدات متكاملة لحوكمة المعرفة الصحية</p>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { icon: Brain, color: 'text-cyan-400', bg: 'bg-cyan-400/10', title: 'المساعد التمريضي AI', text: 'إجابات عن تحضير الأدوية والسياسات من وثائقك المعتمدة فقط' },
              { icon: Calculator, color: 'text-emerald-400', bg: 'bg-emerald-400/10', title: 'حاسبة الجرعات', text: 'معادلات دقيقة معتمدة من الصيادلة مع تحذيرات سريرية' },
              { icon: BookOpen, color: 'text-violet-400', bg: 'bg-violet-400/10', title: 'مكتبة السياسات', text: 'بحث دلالي سريع في جميع السياسات والإجراءات المعتمدة' },
              { icon: FileText, color: 'text-blue-400', bg: 'bg-blue-400/10', title: 'سير اعتماد الوثائق', text: 'دورة حياة كاملة: مسودة → مراجعة → اعتماد → فهرسة AI' },
              { icon: Users, color: 'text-orange-400', bg: 'bg-orange-400/10', title: 'إدارة الأدوار', text: 'سبعة أدوار محكمة: مسؤول، ممرض، صيدلاني، مدير معرفة وأكثر' },
              { icon: Lock, color: 'text-red-400', bg: 'bg-red-400/10', title: 'سجل التدقيق', text: 'كل حدث موثق: من سأل؟ ماذا أجاب AI؟ أي وثيقة استُشهد بها؟' },
            ].map(({ icon: Icon, color, bg, title, text }) => (
              <div key={title} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-colors">
                <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-4`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <h3 className="text-white font-semibold text-sm mb-2">{title}</h3>
                <p className="text-slate-400 text-xs leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Workflow ── */}
      <section id="workflow" className="px-6 py-14 bg-white/3 border-t border-white/10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-white text-2xl font-bold text-center mb-2">كيف يعمل محرك RAG؟</h2>
          <p className="text-slate-400 text-center text-sm mb-10">خط أنابيب صارم يضمن الإجابة من المصدر أو الصمت التام</p>
          <div className="space-y-3">
            {[
              { step: '01', label: 'سؤال الممرض', desc: 'يُرسل السؤال بالعربية عبر الواجهة', color: 'bg-cyan-500' },
              { step: '02', label: 'تحويل إلى Embedding', desc: 'Voyage-3 يحوّل السؤال لمتجه رياضي', color: 'bg-blue-500' },
              { step: '03', label: 'بحث pgvector (ANN)', desc: 'أقرب 20 مقطع من الوثائق المفعّلة فقط', color: 'bg-violet-500' },
              { step: '04', label: 'فلترة التشابه ≥ 0.7', desc: 'استبعاد المقاطع الضعيفة الصلة', color: 'bg-purple-500' },
              { step: '05', label: 'Claude claude-sonnet-4-6 (temp=0.1)', desc: 'يُجيب فقط من السياق المقدم، لا من معرفته العامة', color: 'bg-pink-500' },
              { step: '06', label: 'التحقق من الاستشهادات', desc: 'إذا لم توجد citations → noSourceFlag=true', color: 'bg-red-500' },
            ].map((w) => (
              <div key={w.step} className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl px-5 py-3">
                <div className={`${w.color} w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                  {w.step}
                </div>
                <div className="flex-1 text-right">
                  <div className="text-white text-sm font-medium">{w.label}</div>
                  <div className="text-slate-400 text-xs">{w.desc}</div>
                </div>
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
              </div>
            ))}
          </div>
          <div className="mt-6 bg-red-950/50 border border-red-800/50 rounded-xl p-4 text-center">
            <p className="text-red-300 text-sm font-semibold">إذا لم يوجد مصدر معتمد كافٍ:</p>
            <p className="text-red-400 text-xs mt-1 italic">
              "لا توجد وثيقة معتمدة كافية للإجابة. الرجاء الرجوع للمسؤول المختص."
            </p>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="px-6 py-16 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-white text-2xl font-bold mb-3">جاهز لبدء حوكمة معرفتك؟</h2>
          <p className="text-slate-400 text-sm mb-8">ادخل بحسابك التجريبي وجرّب كامل المنصة</p>
          <div className="bg-white/8 border border-white/15 rounded-2xl p-5 mb-6 text-right">
            <p className="text-slate-300 text-xs mb-3 font-semibold">بيانات الدخول التجريبية:</p>
            <div className="space-y-1.5 text-xs">
              {[
                { role: 'مسؤول عام', email: 'admin@cnpv.sa', pass: 'Admin@1234!' },
                { role: 'ممرضة', email: 'nurse@cnpv.sa', pass: 'Nurse@1234!' },
                { role: 'صيدلاني', email: 'pharmacist@cnpv.sa', pass: 'Pharm@1234!' },
              ].map((u) => (
                <div key={u.email} className="flex items-center gap-2 text-slate-400">
                  <span className="text-cyan-400 font-medium w-24 shrink-0">{u.role}</span>
                  <span className="font-mono">{u.email}</span>
                  <span className="text-slate-500 mr-auto font-mono">{u.pass}</span>
                </div>
              ))}
            </div>
          </div>
          <Link
            href="/(auth)/login"
            className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-white font-bold px-10 py-4 rounded-xl text-base transition-colors"
          >
            ادخل إلى لوحة التحكم
            <ChevronLeft className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/10 px-6 py-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-7 h-7 bg-cyan-500 rounded-full flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-semibold text-sm">منصة CNPV</span>
        </div>
        <p className="text-slate-500 text-xs leading-relaxed max-w-md mx-auto">
          هذه المنصة أداة دعم قرار سريري. لا تُغني عن الحكم الطبي المتخصص.
          جميع الإجابات مستندة إلى وثائق معتمدة من إدارة المستشفى فقط.
        </p>
        <p className="text-slate-600 text-xs mt-3">© 2025 CNPV Platform — Certified Nursing Practice & Knowledge Vault</p>
      </footer>

    </div>
  );
}
