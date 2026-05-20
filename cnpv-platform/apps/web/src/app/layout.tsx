import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'منصة CNPV — حوكمة المعرفة والقرار الموثوق',
  description: 'منصة تمريضية لحوكمة المعرفة وسياسات الرعاية الصحية',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head />
      <body className="min-h-screen bg-slate-50 font-arabic antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
