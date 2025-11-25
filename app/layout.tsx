import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'EdgeSplit - Server-Side A/B Testing with GA4',
  description: 'Create and manage server-side A/B tests with Cloudflare Workers and Google Analytics 4',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen flex flex-col">
          <header className="border-b">
            <div className="container mx-auto px-4 py-4">
              <h1 className="text-2xl font-bold">EdgeSplit</h1>
              <p className="text-sm text-muted-foreground">
                Server-Side A/B Testing Generator
              </p>
            </div>
          </header>
          <main className="flex-1 container mx-auto px-4 py-8">
            {children}
          </main>
          <footer className="border-t py-6 text-center text-sm text-muted-foreground">
            <p>EdgeSplit - Powered by Cloudflare Workers & GA4</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
