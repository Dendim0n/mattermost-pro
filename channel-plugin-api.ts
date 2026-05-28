// Keep bundled channel entry imports narrow so bootstrap/discovery paths do
// not drag the broader Mattermost helper surfaces into lightweight plugin loads.
export { mattermostProPlugin } from "./channel-plugin-runtime.js";
export { mattermostProSetupPlugin } from "./src/channel.setup.js";
