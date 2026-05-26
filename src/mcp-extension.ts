import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { hasGlobalRtk } from "./token-optimizer.js";
import fs from "fs";
import path from "path";
import os from "os";

// ─── Tier-Based Tool Filtering ──────────────────────────────────────
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

  // ─── Google Ads MCP ───────────────────────────────────────────────
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

  // ─── Meta Ads MCP (Local Stdio Server via meta-ads-mcp) ───────────
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
                    text: `Blocking execution of '${tool.name}' because OpenAds is in Audit Mode (Safe/Read-only). Under Audit Mode, campaign write operations are disabled. To execute active changes, please toggle to Launch Mode in Settings (\`openads setup\`).`
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

  // Register clean shutdown on session exit
  pi.on("session_shutdown", async () => {
    for (const { client } of clients) {
      try {
        await client.close();
      } catch (e) {}
    }
  });
}
