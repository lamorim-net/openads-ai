import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { hasGlobalRtk } from "./token-optimizer.js";
import fs from "fs";
import path from "path";
import os from "os";

// ─── Tier-Based Tool Filtering ────────────────────────────────────
// Express → skip MCP entirely (handled by OPENADS_SKIP_MCP env var)
// Standard → 6 read-only discovery + performance tools
// Full → 11 tools (read + write operations)

const STANDARD_META_TOOLS = new Set([
  "get_ad_accounts",
  "list_campaigns",
  "get_campaign",
  "get_campaign_performance",
  "get_insights",
  "list_ad_sets"
]);

const FULL_META_TOOLS = new Set([
  ...STANDARD_META_TOOLS,
  "list_ads",
  "get_creative_performance",
  "pause_campaign",
  "resume_campaign",
  "update_campaign"
]);

export default async function(pi: ExtensionAPI) {
  const configDir = path.join(os.homedir(), '.openads');
  const configPath = path.join(configDir, 'openads.config.json');

  if (!fs.existsSync(configPath)) {
    return;
  }

  let config: any = {};
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (e) {
    return;
  }

  // Skip MCP tool registration during Autoresearch.
  // The model never needs live ad platform tools when generating hypotheses,
  // and each tool schema consumes ~150 tokens of scarce context.
  if (process.env.OPENADS_SKIP_MCP === '1') {
    return;
  }

  const clients: { name: string; client: Client }[] = [];

  // ─── Google Ads MCP ────────────────────────────────────────────────────
  if (config.connectGoogle) {
    try {
      const useRtk = hasGlobalRtk();
      const command = useRtk ? 'rtk' : 'uvx';
      const args = useRtk ? ['uvx', 'adloop'] : ['adloop'];

      const googleTransport = new StdioClientTransport({
        command,
        args,
        stderr: "ignore"
      });

      const googleClient = new Client(
        { name: "openads-google-ads-client", version: "0.2.14" },
        { capabilities: {} }
      );

      await googleClient.connect(googleTransport);
      clients.push({ name: "google-ads", client: googleClient });
    } catch (err: any) {
      console.error(`[OpenAds MCP] Failed to connect to Google Ads: ${err.message}`);
    }
  }

  // ─── Meta Ads MCP (Local Stdio Server via meta-ads-mcp) ─────────────────
  if (config.metaToken) {
    try {
      const useRtk = hasGlobalRtk();
      const command = useRtk ? 'rtk' : 'npx';
      const args = useRtk ? ['npx', '-y', 'meta-ads-mcp'] : ['-y', 'meta-ads-mcp'];

      const metaTransport = new StdioClientTransport({
        command,
        args,
        env: {
          ...process.env,
          "META_ACCESS_TOKEN": config.metaToken
        },
        stderr: "ignore"
      });

      const metaClient = new Client(
        { name: "openads-meta-ads-client", version: "0.2.14" },
        { capabilities: {} }
      );

      await metaClient.connect(metaTransport);
      clients.push({ name: "meta-ads", client: metaClient });
    } catch (err: any) {
      console.error(`[OpenAds MCP] Failed to connect to Meta Ads: ${err.message}`);
    }
  }

  // ─── Dynamically Register Tools ──────────────────────────────────
  const tier = process.env.OPENADS_TIER || 'standard';
  const allowedMetaTools = tier === 'full' ? FULL_META_TOOLS : STANDARD_META_TOOLS;

  for (const { name: serverName, client } of clients) {
    try {
      const toolsResult = await client.listTools();
      for (const tool of toolsResult.tools) {
        // Filter Meta tools by tier (standard=6 read-only, full=11 read+write)
        if (serverName === "meta-ads" && !allowedMetaTools.has(tool.name)) {
          continue;
        }

        pi.registerTool({
          name: tool.name,
          label: tool.name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          description: tool.description || `MCP Tool: ${tool.name}`,
          parameters: tool.inputSchema as any,
          async execute(toolCallId, params, signal, onUpdate, ctx) {
            // Check for Campaign modification write tools
            const isWriteTool = /create|update|delete|set|pause|resume|scale|modify|change/i.test(tool.name);

            if (isWriteTool) {
              if (config.mode === 'audit') {
                return {
                  content: [{
                    type: "text",
                    text: `Blocking execution of '${tool.name}' because OpenAds is in Audit Mode (Safe/Read-only). Campaign write operations are disabled. Toggle to Launch Mode in Settings (openads setup) to make changes.`
                  }],
                  details: {},
                  isError: true,
                };
              }

              if (config.mode === 'launch') {
                const confirmMessage = `You are about to execute a campaign write operation:\n\nTool: ${tool.name}\nParameters:\n${JSON.stringify(params, null, 2)}\n\nDo you want to authorize this change?`;
                const ok = await ctx.ui.confirm("Confirm Campaign Action ⚠️", confirmMessage);
                if (!ok) {
                  return {
                    content: [{
                      type: "text",
                      text: `Action cancelled: execution of '${tool.name}' was not confirmed.`
                    }],
                    details: {},
                    isError: true,
                  };
                }
              }
            }

            try {
              const response = await client.callTool({
                name: tool.name,
                arguments: params as any,
              });
              return {
                content: response.content as any[],
                details: {},
              };
            } catch (err: any) {
              return {
                content: [{
                  type: "text",
                  text: `Error executing MCP tool ${tool.name}: ${err.message}`
                }],
                details: {},
                isError: true,
              };
            }
          }
        });
      }
    } catch (err: any) {
      console.error(`[OpenAds MCP] Failed to register tools for ${serverName}: ${err.message}`);
    }
  }

  // ─── Facebook Page Organic Posting ──────────────────────────────
  if (config.facebookPageToken && config.facebookPageId) {
    const FB_API = 'https://graph.facebook.com/v21.0';
    const PAGE_ID = config.facebookPageId;
    const PAGE_TOKEN = config.facebookPageToken;

    // Read: get recent page posts (Standard + Full)
    pi.registerTool({
      name: 'get_facebook_page_posts',
      label: 'Get Facebook Page Posts',
      description: 'Retrieve recent organic posts from your Facebook Page. Call this before drafting new content to review posting history and avoid repeating topics.',
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Number of recent posts to retrieve (1-25, default 10)',
          },
        },
      },
      async execute(toolCallId, params, signal, onUpdate, ctx) {
        const limit = Math.min((params as any).limit || 10, 25);
        try {
          const res = await fetch(
            `${FB_API}/${PAGE_ID}/posts?fields=message,created_time,full_picture,permalink_url&limit=${limit}&access_token=${PAGE_TOKEN}`
          );
          const data = await res.json() as any;
          if (data.error) throw new Error(data.error.message);
          return {
            content: [{ type: 'text', text: JSON.stringify(data.data, null, 2) }],
            details: {},
          };
        } catch (err: any) {
          return {
            content: [{ type: 'text', text: `Error fetching posts: ${err.message}` }],
            details: {},
            isError: true,
          };
        }
      },
    });

    // Write: publish a post (Full tier only, gated by audit/launch mode)
    if (tier === 'full') {
      pi.registerTool({
        name: 'post_to_facebook_page',
        label: 'Post to Facebook Page',
        description: 'Publish an organic text post (with optional link) to your Facebook Page.',
        parameters: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'The post text content',
            },
            link: {
              type: 'string',
              description: 'Optional URL to attach as a link preview',
            },
          },
          required: ['message'],
        },
        async execute(toolCallId, params, signal, onUpdate, ctx) {
          const p = params as any;

          if (config.mode === 'audit') {
            return {
              content: [{
                type: 'text',
                text: "Blocking 'post_to_facebook_page' — OpenAds is in Audit Mode (Read-only). Switch to Launch Mode in 'openads setup' to publish.",
              }],
              details: {},
              isError: true,
            };
          }

          if (config.mode === 'launch') {
            const preview = p.message.length > 120 ? p.message.slice(0, 120) + '...' : p.message;
            const ok = await ctx.ui.confirm(
              'Confirm Facebook Post ⚠️',
              `You are about to publish to your Facebook Page:\n\n"${preview}"\n${p.link ? "\nLink: " + p.link : ""}\n\nPublish now?`
            );
            if (!ok) {
              return {
                content: [{ type: 'text', text: 'Post cancelled by user.' }],
                details: {},
                isError: true,
              };
            }
          }

          try {
            const body: Record<string, any> = {
              message: p.message,
              access_token: PAGE_TOKEN,
            };
            if (p.link) body.link = p.link;

            const res = await fetch(`${FB_API}/${PAGE_ID}/feed`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            });
            const data = await res.json() as any;
            if (data.error) throw new Error(data.error.message);

            return {
              content: [{
                type: 'text',
                text: `✅ Published!\nPost ID: ${data.id}\nURL: https://www.facebook.com/${data.id.replace("_", "/posts/")}`,
              }],
              details: {},
            };
          } catch (err: any) {
            return {
              content: [{ type: 'text', text: `Error publishing post: ${err.message}` }],
              details: {},
              isError: true,
            };
          }
        },
      });
    }
  }

  // Register clean shutdown on session exit
  pi.on("session_shutdown", async () => {
    for (const { client } of clients) {
      try {
        await client.close();
      } catch (e) {}
    }
  });
}
