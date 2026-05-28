import "./constants-lvhO5Lit.mjs";
import { a as describeMattermostAccount, c as mattermostProMeta, i as MattermostProChannelConfigSchema, n as mattermostSetupWizard, o as isMattermostConfigured, r as mattermostSetupAdapter, s as mattermostProConfigAdapter } from "./channel-plugin-runtime-B2O1Lte5.mjs";
import { t as resolveMattermostGatewayAuthBypassPaths } from "./gateway-auth-bypass-YVKSTzHp.mjs";
//#region src/channel.setup.ts
const mattermostProSetupPlugin = {
	id: "mattermost-pro",
	meta: { ...mattermostProMeta },
	capabilities: {
		chatTypes: [
			"direct",
			"channel",
			"group",
			"thread"
		],
		reactions: true,
		threads: true,
		media: true,
		nativeCommands: true
	},
	reload: { configPrefixes: ["channels.mattermost-pro"] },
	configSchema: MattermostProChannelConfigSchema,
	config: {
		...mattermostProConfigAdapter,
		isConfigured: isMattermostConfigured,
		describeAccount: describeMattermostAccount
	},
	gateway: { resolveGatewayAuthBypassPaths: ({ cfg }) => resolveMattermostGatewayAuthBypassPaths(cfg) },
	setup: mattermostSetupAdapter,
	setupWizard: mattermostSetupWizard
};
//#endregion
export { mattermostProSetupPlugin as t };
