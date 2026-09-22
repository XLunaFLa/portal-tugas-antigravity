import type { Metadata } from 'next';
import './globals.css';
import 'katex/dist/katex.min.css';

export const metadata: Metadata = {
  title: 'Portal Tugas — Academic Workbench',
  description: 'Studio Pengerjaan Tugas, Diskusi, dan Naskah Akademik Bebas AI-Slop',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#080b11',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark" suppressHydrationWarning>
      <body className="antialiased bg-slate-50 dark:bg-[#080b11] text-slate-900 dark:text-slate-100 min-h-screen transition-colors duration-150">
        {children}
      </body>
    </html>
  );
}
