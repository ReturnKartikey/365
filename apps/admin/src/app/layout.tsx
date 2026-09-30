import './globals.css';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '365 Admin — The Daily Music Ritual Desk',
  description: 'Curation, daily scheduling, queue moderation, and ritual release desk.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-gray-200 min-h-screen flex flex-col">
        {/* Editorial Top Masthead */}
        <header className="border-b border-border bg-surface/90 backdrop-blur sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-baseline space-x-3">
                <span className="font-serif text-3xl font-bold tracking-tight text-primary">365</span>
                <span className="text-xs uppercase tracking-widest text-muted font-medium">Curation Desk</span>
              </Link>

              {/* Navigation Links */}
              <nav className="hidden md:flex space-x-1">
                <Link
                  href="/"
                  className="px-3.5 py-2 text-sm font-medium rounded-md text-gray-300 hover:text-white hover:bg-surface-elevated transition"
                >
                  Overview
                </Link>
                <Link
                  href="/schedule"
                  className="px-3.5 py-2 text-sm font-medium rounded-md text-gray-300 hover:text-white hover:bg-surface-elevated transition"
                >
                  Calendar & Select
                </Link>
                <Link
                  href="/queue"
                  className="px-3.5 py-2 text-sm font-medium rounded-md text-gray-300 hover:text-white hover:bg-surface-elevated transition"
                >
                  Queue
                </Link>
                <Link
                  href="/reports"
                  className="px-3.5 py-2 text-sm font-medium rounded-md text-gray-300 hover:text-white hover:bg-surface-elevated transition"
                >
                  Reports
                </Link>
                <Link
                  href="/config"
                  className="px-3.5 py-2 text-sm font-medium rounded-md text-gray-300 hover:text-white hover:bg-surface-elevated transition"
                >
                  Release Config
                </Link>
              </nav>
            </div>

            {/* Admin Profile & Status */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2.5 bg-surface-elevated/80 border border-border px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-gray-300 font-medium">Curator (Admin Claim)</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
