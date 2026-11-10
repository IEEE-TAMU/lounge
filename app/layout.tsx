import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'IEEE TAMU Lounge',
  description: 'Control the IEEE TAMU officer lounge music player.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
