import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { safeRedirectPath } from '@/shared/lib/safeRedirect';

const PUBLIC_ROUTES = ['/login', '/register'];

export async function proxy(request: NextRequest) {
  // El login demo gestiona su propia sesión y el MCP valida su propio token Bearer:
  // sin cookie de Supabase, el redirect a /login rompería a los clientes MCP.
  // Los metadatos OAuth (/.well-known/*) son públicos por definición.
  const { pathname: path } = request.nextUrl;
  if (path === '/api/demo-login' || path === '/api/mcp' || path.startsWith('/.well-known/')) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refrescar sesión si expiró
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublicRoute = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));

  // Redirigir a /login si no autenticado en ruta protegida
  // Se guarda a dónde iba (p. ej. el consentimiento OAuth) para volver tras entrar.
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    if (pathname !== '/') {
      url.searchParams.set('redirect', `${pathname}${request.nextUrl.search}`);
    }
    return NextResponse.redirect(url);
  }

  // Redirigir al dashboard (o a donde iba) si ya está autenticado y accede a login/register
  if (user && isPublicRoute) {
    const target = safeRedirectPath(request.nextUrl.searchParams.get('redirect'));
    return NextResponse.redirect(new URL(target, request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
