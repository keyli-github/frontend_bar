'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Header } from '@/components/layout/header';
import { useAuthStore } from '@/store/auth-store';
import { User, Mail, Shield, Building, Clock, Save, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PerfilPage() {
  const { user, updateProfile, profileImage, setProfileImage } = useAuthStore();
  const [saved, setSaved] = useState(false);
  const [name, setName]   = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const fileRef = useRef<HTMLInputElement>(null);

  const roleLabel: Record<string, string> = {
    superadmin: 'Super Admin', administrador: 'Administrador', empleado: 'Empleado',
  };

  const handleSave = () => {
    updateProfile({ name, email });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setProfileImage(reader.result as string); };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <Header title="Perfil" />

      <div className="p-3 sm:p-4 lg:p-6 space-y-4 lg:space-y-5">
        {/* Avatar + Info card — full width */}
        <div className="rounded-xl border border-border bg-card p-6 lg:p-8 animate-fade-in-up">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar con upload */}
            <div className="relative group">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-amber-600 flex items-center justify-center text-2xl font-bold text-white flex-shrink-0">
                {profileImage ? (
                  <Image src={profileImage} alt="Perfil" fill className="object-cover" />
                ) : (
                  <span>{user?.initials || 'CM'}</span>
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
              >
                <Camera size={20} className="text-white" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            <div className="text-center sm:text-left">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">{user?.name || 'Carlos Mendoza'}</h1>
              <p className="text-sm text-amber-500 font-semibold mt-0.5">{roleLabel[user?.role || 'superadmin']}</p>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 justify-center sm:justify-start">
                <Clock size={12} /> Último acceso: {user?.ultimoAcceso || 'Hace 5 min'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sede: <span className="text-foreground font-medium">{user?.sede || 'Todas'}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Personal info — 2 columns grid */}
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="rounded-xl border border-border bg-card p-5 lg:p-6 space-y-5 animate-fade-in-up" style={{ animationDelay: '60ms' }}>
            <h2 className="font-semibold text-foreground text-base">Información personal</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <User size={11} /> Nombre completo
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/10 transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <Mail size={11} /> Correo electrónico
                </label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/10 transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                    <Shield size={11} /> Rol
                  </label>
                  <input readOnly value={roleLabel[user?.role || 'superadmin']} className="w-full h-10 px-3 rounded-lg bg-muted/30 border border-border text-muted-foreground text-sm cursor-not-allowed" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                    <Building size={11} /> Sede
                  </label>
                  <input readOnly value={user?.sede || 'Todas'} className="w-full h-10 px-3 rounded-lg bg-muted/30 border border-border text-muted-foreground text-sm cursor-not-allowed" />
                </div>
              </div>
              <button
                onClick={handleSave}
                className={cn(
                  'flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all active:scale-[0.98]',
                  saved ? 'bg-emerald-500 text-white' : 'bg-amber-500 hover:bg-amber-400 text-black'
                )}
              >
                <Save size={15} />
                {saved ? 'Guardado ✓' : 'Guardar cambios'}
              </button>
            </div>
          </div>

          {/* Change password */}
          <div className="rounded-xl border border-border bg-card p-5 lg:p-6 space-y-5 animate-fade-in-up" style={{ animationDelay: '120ms' }}>
            <h2 className="font-semibold text-foreground text-base">Cambiar contraseña</h2>
            <div className="space-y-4">
              {[
                { label: 'Contraseña actual', placeholder: '••••••••' },
                { label: 'Nueva contraseña', placeholder: 'Mínimo 8 caracteres' },
                { label: 'Confirmar nueva contraseña', placeholder: 'Repetir contraseña' },
              ].map((f) => (
                <div key={f.label}>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">{f.label}</label>
                  <input
                    type="password"
                    placeholder={f.placeholder}
                    className="w-full h-10 px-3 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/10 transition-all"
                  />
                </div>
              ))}
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border bg-muted/50 hover:bg-muted text-foreground font-medium text-sm transition-all">
                Actualizar contraseña
              </button>
            </div>
          </div>
        </div>

        {/* Activity */}
        <div className="rounded-xl border border-border bg-card p-5 lg:p-6 animate-fade-in-up" style={{ animationDelay: '180ms' }}>
          <h2 className="font-semibold text-foreground text-base mb-4">Actividad reciente</h2>
          <div className="space-y-3">
            {[
              { action: 'Inicio de sesión', time: 'Hace 5 min', detail: 'Zona Rosa' },
              { action: 'Venta procesada · T-0892', time: 'Hace 30 min', detail: '$187.000' },
              { action: 'Producto creado: Mojito Premium', time: 'Hace 1 hora', detail: 'Catálogo' },
              { action: 'Ajuste de inventario', time: 'Hace 2 horas', detail: 'Whiskey JW Black +6' },
              { action: 'Cierre de turno', time: 'Ayer 02:15 a.m.', detail: 'Saldo: $1.650.500' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 text-sm py-2 border-b border-border last:border-0">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-foreground">{item.action}</span>
                  <span className="text-muted-foreground ml-2 text-xs">{item.detail}</span>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
