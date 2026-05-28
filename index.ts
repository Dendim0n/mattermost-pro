import { defineChannelPluginEntry } from "openclaw/plugin-sdk/channel-core";
import { mattermostProPlugin } from "./channel-plugin-api.js";
import { setMattermostProRuntime } from "./runtime-api.js";
import { registerSlashCommandRoute as registerMattermostProSlashCommandRoute } from "./slash-route-api.js";

export default defineChannelPluginEntry({
  id: "mattermost-pro",
  name: "Mattermost Pro",
  description: "Private Mattermost channel plugin",
  plugin: mattermostProPlugin,
  setRuntime: setMattermostProRuntime,
  registerFull(api) {
    // Actual slash-command registration happens after the monitor connects and
    // knows the team id; the route itself can be wired here.
    registerMattermostProSlashCommandRoute(api);
  },
});
