'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/shared/lib/supabase';
import { Loader2, UserPlus, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setIsLoading(true);
    setError('');

    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
      setIsLoading(false);
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#0A1E3F] text-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center bg-[#0D0D0D] border border-white/10 rounded-2xl p-8 shadow-2xl">
          <CheckCircle2 className="w-12 h-12 text-[#FF6B1A] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">¡Revisa tu correo!</h2>
          <p className="text-white/70 text-sm mb-6">
            Te enviamos un link de confirmación a <strong className="text-white">{email}</strong>.
            Haz clic en el link para activar tu cuenta.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center w-full bg-[#FF6B1A] hover:bg-[#E05A10] text-white font-semibold py-2.5 rounded-lg shadow-md shadow-[#FF6B1A]/20 transition-all text-sm"
          >
            Volver al login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A1E3F] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center justify-center gap-1.5">
            Project <span className="text-[#FF6B1A]">Manager</span>
          </h1>
          <p className="text-white/60 text-sm mt-1">Crea tu cuenta gratis</p>
        </div>

        <div className="bg-[#0D0D0D] border border-white/10 rounded-2xl p-6 shadow-2xl">
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/80">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                autoFocus
                className="bg-[#0A1E3F] border border-white/15 text-white placeholder:text-white/30 focus-visible:ring-[#FF6B1A]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/80">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  className="pr-10 bg-[#0A1E3F] border border-white/15 text-white placeholder:text-white/30 focus-visible:ring-[#FF6B1A]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-950/40 border border-red-500/30 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full bg-[#FF6B1A] hover:bg-[#E05A10] text-white font-semibold shadow-lg shadow-[#FF6B1A]/20 transition-all"
              disabled={isLoading}
            >
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creando cuenta...</>
              ) : (
                <><UserPlus className="mr-2 h-4 w-4" />Crear cuenta</>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-white/50 mt-5">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="font-medium text-[#FF6B1A] hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
