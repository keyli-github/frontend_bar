import type { Metadata } from 'next';
import '@fontsource-variable/inter';
import './globals.css';
import { ThemeProvider } from '@/components/layout/theme-provider';

export const metadata: Metadata = {
  title: 'Bar beer — ERP System',
  description: 'Sistema de gestión para bares y restaurantes',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full antialiased dark" suppressHydrationWarning>
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
