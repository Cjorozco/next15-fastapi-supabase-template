'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/shared/lib/supabase';
import { Loader2, LogIn, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message === 'Invalid login credentials'
        ? 'Email o contraseña incorrectos'
        : error.message
      );
      setIsLoading(false);
    }
    // Si no hay error, el AuthContext detecta SIGNED_IN y redirige a /
  };

  return (
    <div className="min-h-screen bg-[#0A1E3F] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center justify-center gap-1.5">
            Project <span className="text-[#FF6B1A]">Manager</span>
          </h1>
          <p className="text-white/60 text-sm mt-1">Inicia sesión para continuar</p>
        </div>

        <div className="bg-[#0D0D0D] border border-white/10 rounded-2xl p-6 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-4">
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
                data-cy="login-email"
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
                  placeholder="••••••••"
                  required
                  className="pr-10 bg-[#0A1E3F] border border-white/15 text-white placeholder:text-white/30 focus-visible:ring-[#FF6B1A]"
                  data-cy="login-password"
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
              <p className="text-sm text-red-400 bg-red-950/40 border border-red-500/30 rounded-md px-3 py-2" data-cy="login-error">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full bg-[#FF6B1A] hover:bg-[#E05A10] text-white font-semibold shadow-lg shadow-[#FF6B1A]/20 transition-all"
              disabled={isLoading}
              data-cy="login-submit"
            >
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Entrando...</>
              ) : (
                <><LogIn className="mr-2 h-4 w-4" />Iniciar sesión</>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-white/50 mt-5">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="font-medium text-[#FF6B1A] hover:underline">
              Regístrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
