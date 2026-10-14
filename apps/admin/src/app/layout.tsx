import './globals.css';
import type { Metadata } from 'next';
import { AdminHeader } from '../components/AdminHeader';

export const metadata: Metadata = {
  title: '365 — Master Curation Console',
  description: 'Audiophile daily broadcast desk, queue audition crate, and ritual scheduling engine.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-cream min-h-screen flex flex-col font-sans selection:bg-primary/30 selection:text-cream">
        <AdminHeader />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10">
          {children}
        </main>

        {/* Subtle Editorial Footer */}
        <footer className="border-t border-border/60 py-6 text-center text-xs text-muted font-mono tracking-wider">
          <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>365 RITUAL DESK · ONE SONG EVERY DAY</span>
            <span className="text-[11px] text-muted/60">SYNCHRONIZED DAILY AT 7:00 PM IST</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
