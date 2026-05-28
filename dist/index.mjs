import { t as mattermostProPlugin } from "./channel-plugin-runtime-B2O1Lte5.mjs";
import "./channel-plugin-api-BJY748jV.mjs";
import { n as setMattermostProRuntime } from "./runtime-CtaUqSvR.mjs";
import "./runtime-api.mjs";
import { i as registerSlashCommandRoute } from "./slash-state-BRtyJ5Mi.mjs";
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
