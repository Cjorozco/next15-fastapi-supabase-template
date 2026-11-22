import {
  getPublicOrigin,
  metadataCorsOptionsRequestHandler,
  protectedResourceHandler,
} from 'mcp-handler';
import { MCP_PATH } from '@/domains/mcp/lib/resource';
import { supabaseIssuer } from '@/domains/mcp/lib/supabaseToken';

/**
 * OAuth protected resource metadata (RFC 9728) for the MCP endpoint. Tells MCP clients
 * that Supabase Auth issues the tokens. Served both at the root path and at the
 * path-suffixed form the 401 points to; `resource` is always `<origin>/api/mcp`.
 */
export const dynamic = 'force-dynamic';

export function GET(request: Request): Response {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return new Response('Not found', { status: 404 });
  return protectedResourceHandler({
    authServerUrls: [supabaseIssuer(supabaseUrl)],
    resourceUrl: `${getPublicOrigin(request)}${MCP_PATH}`,
  })(request);
}

export const OPTIONS = metadataCorsOptionsRequestHandler();
