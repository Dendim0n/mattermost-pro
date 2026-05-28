import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";
import { mattermostProSetupPlugin } from "./channel-plugin-api.js";

export default defineSetupPluginEntry(mattermostProSetupPlugin);
