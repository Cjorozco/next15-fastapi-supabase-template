/** Path of the MCP endpoint; with the origin it is the URL users enter in Claude. */
export const MCP_PATH = '/api/mcp';

/** Protected resource metadata (RFC 9728) for the MCP endpoint, path-suffixed form. */
export const MCP_RESOURCE_METADATA_PATH = `/.well-known/oauth-protected-resource${MCP_PATH}`;
