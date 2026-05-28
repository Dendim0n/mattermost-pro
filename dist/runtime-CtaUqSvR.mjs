import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";
//#region src/runtime.ts
const { setRuntime: setMattermostProRuntime, getRuntime: getMattermostProRuntime } = createPluginRuntimeStore({
	pluginId: "mattermost-pro",
	errorMessage: "Mattermost runtime not initialized"
});
//#endregion
export { setMattermostProRuntime as n, getMattermostProRuntime as t };
