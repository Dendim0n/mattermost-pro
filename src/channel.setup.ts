import type { ChannelPlugin } from "./channel-api.js";
import {
  describeMattermostAccount,
  isMattermostConfigured,
  mattermostProConfigAdapter,
  mattermostProMeta,
  resolveMattermostGatewayAuthBypassPaths,
} from "./channel-config-shared.js";
import { MattermostProChannelConfigSchema } from "./config-surface.js";
import { type ResolvedMattermostAccount } from "./mattermost/accounts.js";
import { mattermostSetupAdapter } from "./setup-core.js";
import { mattermostSetupWizard } from "./setup-surface.js";

export const mattermostProSetupPlugin: ChannelPlugin<ResolvedMattermostAccount> = {
  id: "mattermost-pro",
  meta: {
    ...mattermostProMeta,
  },
  capabilities: {
    chatTypes: ["direct", "channel", "group", "thread"],
    reactions: true,
    threads: true,
    media: true,
    nativeCommands: true,
  },
  reload: { configPrefixes: ["channels.mattermost-pro"] },
  configSchema: MattermostProChannelConfigSchema,
  config: {
    ...mattermostProConfigAdapter,
    isConfigured: isMattermostConfigured,
    describeAccount: describeMattermostAccount,
  },
  gateway: {
    resolveGatewayAuthBypassPaths: ({ cfg }) => resolveMattermostGatewayAuthBypassPaths(cfg),
  },
  setup: mattermostSetupAdapter,
  setupWizard: mattermostSetupWizard,
};
