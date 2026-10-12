import './globals.css';
import type { Metadata } from 'next';
import { AdminHeader } from '../components/AdminHeader';

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
      <body className="bg-background text-gray-200 min-h-screen flex flex-col font-sans">
        <AdminHeader />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
