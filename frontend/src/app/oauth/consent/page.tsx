import { redirect } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { createSupabaseServerClient } from '@/shared/lib/supabaseServer';

/**
 * Consent screen of the OAuth 2.1 server (Supabase Auth → OAuth Server → Authorization
 * Path = /oauth/consent). Supabase sends the user here with `authorization_id`; the proxy
 * already made them sign in. Approving lets that client (e.g. Claude) read this account's
 * projects and tasks, create them, change task status and edit project name, description
 * and status (never delete) through the MCP
 * server. Keep this text in sync with the tools in `src/app/api/mcp/route.ts`.
 */
export const dynamic = 'force-dynamic';

async function decide(formData: FormData) {
  'use server';
  const authorizationId = String(formData.get('authorization_id') ?? '');
  const approve = formData.get('decision') === 'approve';
  if (!authorizationId) redirect('/hoy');

  const supabase = await createSupabaseServerClient();
  const { data, error } = approve
    ? await supabase.auth.oauth.approveAuthorization(authorizationId, { skipBrowserRedirect: true })
    : await supabase.auth.oauth.denyAuthorization(authorizationId, { skipBrowserRedirect: true });
  if (error || !data) {
    redirect(`/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}&error=1`);
  }
  redirect(data.redirect_url);
}

function Message({ title, text }: { title: string; text: string }) {
  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-xl text-center space-y-2">
        <h1 className="text-base font-semibold">{title}</h1>
        <p className="text-xs text-muted-foreground">{text}</p>
      </div>
    </main>
  );
}

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ authorization_id?: string; error?: string }>;
}) {
  const { authorization_id: authorizationId, error: decisionFailed } = await searchParams;
  if (!authorizationId) {
    return <Message title="Solicitud no válida" text="Falta el identificador de autorización." />;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
  if (error || !data) {
    return (
      <Message
        title="Solicitud caducada o no válida"
        text="Vuelve a conectar desde la aplicación que te trajo aquí."
      />
    );
  }
  // Already approved before: Supabase answers with the redirect directly.
  if (!('authorization_id' in data)) redirect(data.redirect_url);

  let redirectHost = data.redirect_uri;
  try {
    redirectHost = new URL(data.redirect_uri).host;
  } catch {
    // Show the raw value if it is not a URL.
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-xl space-y-5">
        <div className="text-center space-y-2">
          <ShieldCheck className="mx-auto size-8 text-primary" aria-hidden />
          <h1 className="text-base font-semibold">
            ¿Dar acceso a {data.client.name || 'esta aplicación'}?
          </h1>
          <p className="text-xs text-muted-foreground">Cuenta: {data.user.email}</p>
        </div>

        <ul className="text-xs space-y-1.5 list-disc pl-4">
          <li>Podrá leer tus proyectos y tareas.</li>
          <li>Podrá crear proyectos y tareas, y cambiar el estado de una tarea.</li>
          <li>Podrá cambiar el nombre, la descripción y el estado de un proyecto.</li>
          <li>No podrá borrar nada.</li>
          <li>No verá tus claves ni datos de otros usuarios.</li>
        </ul>

        <p className="text-xs text-muted-foreground">
          Te devolverá a <strong className="text-foreground break-all">{redirectHost}</strong>.
          Si no reconoces esta dirección, deniega.
        </p>

        {decisionFailed && (
          <p role="alert" className="text-xs text-destructive">
            No se pudo guardar tu respuesta. Inténtalo de nuevo.
          </p>
        )}

        <form action={decide} className="flex gap-2">
          <input type="hidden" name="authorization_id" value={authorizationId} />
          <Button type="submit" name="decision" value="deny" variant="outline" className="flex-1">
            Denegar
          </Button>
          <Button type="submit" name="decision" value="approve" className="flex-1">
            Permitir
          </Button>
        </form>
      </div>
    </main>
  );
}
