import type { Metadata } from 'next';
import { Fraunces, Inter_Tight, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { NavigationWrapper } from '@/components/navigation-wrapper';
import { Footer } from '@/components/footer';
import { checkConfigStatus, config } from '@/lib/config';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
});

const interTight = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-inter-tight',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: `${config.app.name} — ${config.app.tagline}`,
    template: `%s | ${config.app.name}`,
  },
  description: `${config.app.name} — ${config.app.tagline} ${config.app.description}`,
  openGraph: {
    title: `${config.app.name} — ${config.app.tagline}`,
    description: config.app.description,
    siteName: config.app.name,
    locale: 'en_US',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const configStatus = checkConfigStatus();

  return (
    <html
      lang="en"
      className={`h-full antialiased ${fraunces.variable} ${interTight.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink font-sans selection:bg-ink selection:text-paper">
        {/* NavigationWrapper ensures Navbar is NEVER rendered on the homepage ('/') so the sculpture hero is never clipped */}
        <NavigationWrapper
          supabaseConfigured={configStatus.supabaseConfigured}
          missingServerKeys={configStatus.missingServer}
        />

        <main className="flex-1 flex flex-col">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
