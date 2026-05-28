import { collectSimpleChannelFieldAssignments, getChannelSurface } from "openclaw/plugin-sdk/channel-secret-basic-runtime";
//#region src/secret-contract.ts
const secretTargetRegistryEntries = [{
	id: "channels.mattermost-pro.accounts.*.botToken",
	targetType: "channels.mattermost-pro.accounts.*.botToken",
	configFile: "openclaw.json",
	pathPattern: "channels.mattermost-pro.accounts.*.botToken",
	secretShape: "secret_input",
	expectedResolvedValue: "string",
	includeInPlan: true,
	includeInConfigure: true,
	includeInAudit: true
}, {
	id: "channels.mattermost-pro.botToken",
	targetType: "channels.mattermost-pro.botToken",
	configFile: "openclaw.json",
	pathPattern: "channels.mattermost-pro.botToken",
	secretShape: "secret_input",
	expectedResolvedValue: "string",
	includeInPlan: true,
	includeInConfigure: true,
	includeInAudit: true
}];
function collectRuntimeConfigAssignments(params) {
	const resolved = getChannelSurface(params.config, "mattermost-pro");
	if (!resolved) return;
	const { channel: mattermost, surface } = resolved;
	collectSimpleChannelFieldAssignments({
		channelKey: "mattermost-pro",
		field: "botToken",
		channel: mattermost,
		surface,
		defaults: params.defaults,
		context: params.context,
		topInactiveReason: "no enabled account inherits this top-level Mattermost botToken.",
		accountInactiveReason: "Mattermost account is disabled."
	});
}
const channelSecrets = {
	secretTargetRegistryEntries,
	collectRuntimeConfigAssignments
};
//#endregion
export { collectRuntimeConfigAssignments as n, secretTargetRegistryEntries as r, channelSecrets as t };
