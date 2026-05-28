import { t as mattermostProPlugin } from "./channel-plugin-runtime-DY5Z0EP0.mjs";
import "./channel-plugin-api-C6-Vit83.mjs";
import { n as setMattermostProRuntime } from "./runtime-CtaUqSvR.mjs";
import "./runtime-api.mjs";
import { i as registerSlashCommandRoute } from "./slash-state-C_Qa4GLl.mjs";
import "./slash-route-api.mjs";
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/channel-core";
//#region index.ts
var mattermost_pro_default = defineChannelPluginEntry({
	id: "mattermost-pro",
	name: "Mattermost Pro",
	description: "Private Mattermost channel plugin",
	plugin: mattermostProPlugin,
	setRuntime: setMattermostProRuntime,
	registerFull(api) {
		registerSlashCommandRoute(api);
	}
});
//#endregion
export { mattermost_pro_default as default };
