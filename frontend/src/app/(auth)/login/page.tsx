'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/shared/lib/supabase';
import { Loader2, LogIn, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

export default function LoginPage() {
  const router = useRouter();
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
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 transition-colors">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center justify-center gap-1.5">
            Project <span className="text-primary">Manager</span>
          </h1>
          <p className="text-muted-foreground text-xs mt-1">Inicia sesión para acceder a tus proyectos</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs text-muted-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                autoFocus
                className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground text-xs rounded-xl focus-visible:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs text-muted-foreground">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="pr-10 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground text-xs rounded-xl focus-visible:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-500 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full bg-primary hover:opacity-90 text-white font-medium text-xs py-2 rounded-xl shadow-md shadow-primary/20 transition-all"
              disabled={isLoading}
            >
              {isLoading ? (
                <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Entrando...</>
              ) : (
                <><LogIn className="mr-2 h-3.5 w-3.5" />Iniciar sesión</>
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-5">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Regístrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
