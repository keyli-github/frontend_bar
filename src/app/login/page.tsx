'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuthStore } from '@/store/auth-store';
import { Eye, EyeOff, LogIn } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPassword, setShowPass] = useState(false);
  const [remember, setRemember]     = useState(false);
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  const { login } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    if (login(email, password)) {
      router.push('/dashboard');
    } else {
      setError('Credenciales inválidas. Verifica e intenta de nuevo.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex overflow-hidden">

      {/* ══════════════════════════════════════
          MITAD IZQUIERDA — imagen de fondo + logo
         ══════════════════════════════════════ */}
      <div className="hidden lg:flex flex-col relative w-1/2">
        {/* Imagen */}
        <Image
          src="/assets/img_login.jpg"
          alt="Bar Beer"
          fill
          className="object-cover"
          priority
          quality={90}
        />
        {/* Overlay gradiente */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-black/10" />

        {/* Contenido izquierdo */}
        <div className="relative z-10 flex flex-col h-full p-12 justify-between">
          {/* Logo */}
          <div className="animate-fade-in-up">
            <Image
              src="/assets/barbeer.png"
              alt="Bar Beer"
              width={200}
              height={200}
              className="object-contain drop-shadow-2xl"
              priority
            />
          </div>

          {/* Texto central */}
          <div className="animate-fade-in-up" style={{ animationDelay: '150ms' }}>
            <h1 className="text-5xl font-extrabold text-white leading-tight">
              Bienvenido a<br />
              <span className="text-amber-400">Bar Beer</span>
            </h1>
            <p className="text-white/60 text-lg mt-3 max-w-sm leading-relaxed">
              Gestiona tu bar de forma rápida, segura y eficiente.
            </p>
          </div>

          {/* Footer */}
          <p className="text-white/25 text-xs">
            © {new Date().getFullYear()} Bar beer ERP. Todos los derechos reservados.
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════
          MITAD DERECHA — formulario
         ══════════════════════════════════════ */}
      <div className="flex-1 lg:w-1/2 relative flex items-center justify-center p-6 sm:p-10 bg-[#0d0c0a]">

        {/* Fondo mobile */}
        <div className="lg:hidden absolute inset-0">
          <Image src="/assets/img_login.jpg" alt="" fill className="object-cover opacity-20" priority />
          <div className="absolute inset-0 bg-black/60" />
        </div>

        {/* Glow decorativo */}
        <div className="absolute top-0 left-0 w-80 h-80 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-amber-600/5 rounded-full blur-[80px] pointer-events-none" />

        {/* Card del formulario */}
        <div className="relative z-10 w-full max-w-[420px] animate-scale-in">

          {/* Logo móvil */}
          <div className="lg:hidden flex justify-center mb-8">
            <Image src="/assets/barbeer.png" alt="Bar Beer" width={110} height={110} className="object-contain" />
          </div>

          {/* Título */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white tracking-tight">Iniciar sesión</h2>
            <p className="text-white/40 text-sm mt-1.5">Ingresa tus credenciales para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Email */}
            <div>
              <label className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-2 block">
                Usuario
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@barbeer.com"
                autoComplete="email"
                required
                className="w-full h-12 px-4 rounded-xl bg-white/[0.07] border border-white/[0.12] text-white placeholder:text-white/25 text-sm focus:outline-none focus:border-amber-500/60 focus:bg-white/[0.09] transition-all"
              />
            </div>

            {/* Contraseña */}
            <div>
              <label className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-2 block">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full h-12 pl-4 pr-12 rounded-xl bg-white/[0.07] border border-white/[0.12] text-white placeholder:text-white/25 text-sm focus:outline-none focus:border-amber-500/60 focus:bg-white/[0.09] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Recordarme + Olvidaste */}
            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <div
                  onClick={() => setRemember(!remember)}
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer flex-shrink-0 ${remember ? 'bg-amber-500 border-amber-500' : 'border-white/20 bg-transparent'}`}
                >
                  {remember && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className="text-sm text-white/50 group-hover:text-white/70 transition-colors">Recordarme</span>
              </label>
              <button type="button" className="text-sm text-amber-400/80 hover:text-amber-400 transition-colors">
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 animate-fade-in">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl font-bold text-sm uppercase tracking-widest transition-all duration-200 disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2.5 mt-2 text-black"
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                boxShadow: '0 6px 24px rgba(245,158,11,0.25)',
              }}
            >
              {loading ? (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <LogIn size={17} />
              )}
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-white/8" />
              <span className="text-xs text-white/20 font-medium">o</span>
              <div className="flex-1 h-px bg-white/8" />
            </div>

            {/* Back to site */}
            <button
              type="button"
              className="w-full h-11 rounded-xl bg-white/[0.05] border border-white/[0.10] text-white/60 text-sm font-medium hover:bg-white/[0.08] hover:text-white/80 hover:border-white/[0.15] transition-all flex items-center justify-center gap-2"
            >
              Volver al sitio
            </button>
          </form>

          {/* Hint demo */}
          <p className="text-center text-[11px] text-white/20 mt-6">
            Demo: <span className="text-white/30">keyli@barbeer.com</span> / <span className="text-white/30">keyli123</span>
          </p>
        </div>
      </div>
    </div>
  );
}
