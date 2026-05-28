import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";
import type { PluginRuntime } from "openclaw/plugin-sdk/runtime-store";

const { setRuntime: setMattermostProRuntime, getRuntime: getMattermostProRuntime } =
  createPluginRuntimeStore<PluginRuntime>({
    pluginId: "mattermost-pro",
    errorMessage: "Mattermost runtime not initialized",
  });
export { getMattermostProRuntime, setMattermostProRuntime };
