'use client';

import { useAuth } from '@/shared/context/AuthContext';

export function DemoBanner() {
  const { user } = useAuth();
  const demoEmail = process.env.NEXT_PUBLIC_DEMO_EMAIL;

  if (!demoEmail || user?.email?.toLowerCase() !== demoEmail.toLowerCase()) {
    return null;
  }

  return (
    <div
      role="status"
      className="bg-primary/10 border-b border-primary/30 text-primary text-xs text-center px-4 py-2"
    >
      Estás en modo demo — los cambios se reinician periódicamente
    </div>
  );
}
