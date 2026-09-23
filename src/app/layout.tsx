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
      <body className="antialiased bg-slate-50 dark:bg-[#080b11] text-slate-900 dark:text-slate-100 min-h-screen relative selection:bg-blue-500/20 selection:text-blue-400">
        {/* Living Ambient Mesh & Aurora Background */}
        <div className="bg-ambient-mesh" aria-hidden="true">
          <div className="aurora-orb-1" />
          <div className="aurora-orb-2" />
          <div className="aurora-orb-3" />
        </div>
        {/* Subtle Architectural Grid Overlay */}
        <div className="bg-grid-overlay" aria-hidden="true" />
        {/* Main Content Layer */}
        <div className="relative z-10 min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
