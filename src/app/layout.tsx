import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { BoneyardProvider } from '@/components/layout/boneyard-provider';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Bar beer — ERP System',
  description: 'Sistema de gestión para bares y restaurantes',
  icons: {
    icon: '/assets/barbeerLogo.png',
    shortcut: '/assets/barbeerLogo.png',
    apple: '/assets/barbeerLogo.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} h-full antialiased dark`} suppressHydrationWarning>
      <head>
        {/* Previene flash de tema incorrecto */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var s=JSON.parse(localStorage.getItem('barbeer-theme')||'{}');var t=s.state&&s.state.theme;if(t==='light')document.documentElement.classList.remove('dark');else document.documentElement.classList.add('dark');}catch(e){}})();` }} />
      </head>
      <body className="min-h-full flex flex-col bg-background">
        <BoneyardProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </BoneyardProvider>
        {/* Avisos de exito/error de las mutaciones contra la API. */}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
