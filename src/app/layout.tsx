import type { Metadata } from 'next';
import { Inter, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/layout/theme-provider';

/* Inter como fuente principal — limpia y profesional */
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800'],
});

/* Geist Mono sólo para números/código */
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Bar beer — ERP System',
  description: 'Sistema de gestión para bares y restaurantes',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <head>
        {/* Previene flash de tema incorrecto */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var s=JSON.parse(localStorage.getItem('barbeer-theme')||'{}');var t=s.state&&s.state.theme;if(t==='light')document.documentElement.classList.remove('dark');else document.documentElement.classList.add('dark');}catch(e){}})();` }} />
      </head>
      <body className="min-h-full flex flex-col bg-background">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
