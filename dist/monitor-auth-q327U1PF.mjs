import { createChannelMessageReplyPipeline } from "openclaw/plugin-sdk/channel-message";
import { createChannelPairingController } from "openclaw/plugin-sdk/channel-pairing";
import { normalizeLowercaseStringOrEmpty } from "openclaw/plugin-sdk/string-coerce-runtime";
import { isTrustedProxyAddress, parseStrictPositiveInteger, resolveClientIp } from "openclaw/plugin-sdk/core";
import { resolveAllowlistMatchSimple } from "openclaw/plugin-sdk/allow-from";
import { buildAgentMediaPayload } from "openclaw/plugin-sdk/agent-media-payload";
import { listSkillCommandsForAgents } from "openclaw/plugin-sdk/command-auth-native";
import { buildModelsProviderData } from "openclaw/plugin-sdk/models-provider-runtime";
import { resolveAllowlistProviderRuntimeGroupPolicy, resolveDefaultGroupPolicy, warnMissingProviderGroupPolicyFallbackOnce } from "openclaw/plugin-sdk/runtime-group-policy";
import { isDangerousNameMatchingEnabled } from "openclaw/plugin-sdk/dangerous-name-runtime";
import { logInboundDrop } from "openclaw/plugin-sdk/channel-inbound";
import { logTypingFailure } from "openclaw/plugin-sdk/channel-feedback";
import { loadOutboundMediaFromUrl } from "openclaw/plugin-sdk/outbound-media";
import { isRequestBodyLimitError, readRequestBodyWithLimit } from "openclaw/plugin-sdk/webhook-ingress";
import { DEFAULT_GROUP_HISTORY_LIMIT, createChannelHistoryWindow } from "openclaw/plugin-sdk/reply-history";
import { registerPluginHttpRoute } from "openclaw/plugin-sdk/webhook-targets";
import { resolveChannelMediaMaxBytes } from "openclaw/plugin-sdk/media-runtime";
import { parseAccessGroupAllowFromEntry } from "openclaw/plugin-sdk/access-groups";
import { resolveStableChannelMessageIngress } from "openclaw/plugin-sdk/channel-ingress-runtime";
//#region src/mattermost/monitor-auth.ts
const mattermostIngressIdentity = {
	key: "sender-id",
	normalize: normalizeMattermostAllowEntry,
	aliases: [{
		key: "sender-name",
		kind: "plugin:mattermost-user-name",
		normalizeEntry: normalizeMattermostAllowEntry,
		normalizeSubject: normalizeMattermostAllowEntry,
		dangerous: true
	}],
	isWildcardEntry: (entry) => normalizeMattermostAllowEntry(entry) === "*",
	resolveEntryId: ({ entryIndex, fieldKey }) => `mattermost-entry-${entryIndex + 1}:${fieldKey === "sender-name" ? "name" : "user"}`
};
function normalizeMattermostAllowEntry(entry) {
	const trimmed = entry.trim();
	if (!trimmed) return "";
	if (trimmed === "*") return "*";
	const accessGroupName = parseAccessGroupAllowFromEntry(trimmed);
	if (accessGroupName) return `accessGroup:${accessGroupName}`;
	const normalized = trimmed.replace(/^(mattermost|user):/i, "").replace(/^@/, "").trim();
	return normalized ? normalizeLowercaseStringOrEmpty(normalized) : "";
}
function normalizeMattermostAllowList(entries) {
	return uniqueMattermostStrings(entries.map((entry) => normalizeMattermostAllowEntry(String(entry))).filter(Boolean));
}
function uniqueMattermostStrings(values) {
	return [...new Set(values)];
}
function isMattermostSenderAllowed(params) {
	const allowFrom = normalizeMattermostAllowList(params.allowFrom);
	if (allowFrom.length === 0) return false;
	return resolveAllowlistMatchSimple({
		allowFrom,
		senderId: normalizeMattermostAllowEntry(params.senderId),
		senderName: params.senderName ? normalizeMattermostAllowEntry(params.senderName) : void 0,
		allowNameMatching: params.allowNameMatching
	}).allowed;
}
function mapMattermostChannelKind(channelType) {
	const normalized = channelType?.trim().toUpperCase();
	if (normalized === "D") return "direct";
	if (normalized === "G" || normalized === "P") return "group";
	return "channel";
}
async function resolveMattermostMonitorInboundAccess(params) {
	const { account, cfg, senderId, senderName, channelId, kind, groupPolicy, storeAllowFrom, allowTextCommands, hasControlCommand } = params;
	const dmPolicy = account.config.dmPolicy ?? "pairing";
	const allowNameMatching = isDangerousNameMatchingEnabled(account.config);
	const configAllowFrom = account.config.allowFrom ?? [];
	const configGroupAllowFrom = account.config.groupAllowFrom ?? [];
	const readStoreAllowFrom = params.readStoreAllowFrom ?? (storeAllowFrom != null ? async () => [...storeAllowFrom] : void 0);
	return await resolveStableChannelMessageIngress({
		channelId: "mattermost-pro",
		accountId: account.accountId,
		identity: mattermostIngressIdentity,
		cfg,
		...readStoreAllowFrom ? { readStoreAllowFrom } : {},
		useDefaultPairingStore: params.readStoreAllowFrom === void 0 && storeAllowFrom == null,
		subject: {
			stableId: senderId,
			aliases: { "sender-name": senderName }
		},
		conversation: {
			kind,
			id: channelId
		},
		event: {
			kind: params.eventKind ?? "message",
			authMode: "inbound",
			mayPair: params.mayPair ?? true
		},
		dmPolicy,
		groupPolicy,
		policy: {
			groupAllowFromFallbackToAllowFrom: true,
			mutableIdentifierMatching: allowNameMatching ? "enabled" : "disabled"
		},
		allowFrom: configAllowFrom,
		groupAllowFrom: configGroupAllowFrom,
		command: {
			allowTextCommands,
			hasControlCommand: allowTextCommands && hasControlCommand,
			directGroupAllowFrom: kind === "direct" ? "effective" : "none"
		}
	});
}
function resolveMattermostCommandDenyReason(params) {
	if (params.decision.decision === "allow") return null;
	if (params.kind === "direct") {
		if (params.decision.reasonCode === "dm_policy_disabled") return "dm-disabled";
		if (params.dmPolicy === "pairing" && (params.decision.admission === "pairing-required" || params.decision.reasonCode === "dm_policy_pairing_required")) return "dm-pairing";
		return "unauthorized";
	}
	if (params.decision.reasonCode === "group_policy_disabled") return "channels-disabled";
	if (params.decision.reasonCode === "group_policy_empty_allowlist") return "channel-no-allowlist";
	return "unauthorized";
}
async function authorizeMattermostCommandInvocation(params) {
	const { account, cfg, senderId, senderName, channelId, channelInfo, storeAllowFrom, readStoreAllowFrom, allowTextCommands, hasControlCommand } = params;
	if (!channelInfo?.type) return {
		ok: false,
		denyReason: "unknown-channel",
		commandAuthorized: false,
		channelInfo,
		kind: "channel",
		chatType: "channel",
		channelName: "",
		channelDisplay: "",
		roomLabel: `#${channelId}`
	};
	const kind = mapMattermostChannelKind(channelInfo.type);
	const chatType = kind;
	const channelName = channelInfo.name ?? "";
	const channelDisplay = channelInfo.display_name ?? channelName;
	const roomLabel = channelName ? `#${channelName}` : channelDisplay || `#${channelId}`;
	const defaultGroupPolicy = cfg.channels?.defaults?.groupPolicy;
	const ingress = await resolveMattermostMonitorInboundAccess({
		account,
		cfg,
		senderId,
		senderName,
		channelId,
		kind,
		groupPolicy: account.config.groupPolicy ?? defaultGroupPolicy ?? "allowlist",
		storeAllowFrom,
		readStoreAllowFrom,
		allowTextCommands,
		hasControlCommand,
		eventKind: "native-command",
		mayPair: true
	});
	const denyReason = resolveMattermostCommandDenyReason({
		decision: ingress.ingress,
		kind,
		dmPolicy: account.config.dmPolicy ?? "pairing"
	});
	if (denyReason) return {
		ok: false,
		denyReason,
		commandAuthorized: false,
		channelInfo,
		kind,
		chatType,
		channelName,
		channelDisplay,
		roomLabel
	};
	return {
		ok: true,
		commandAuthorized: ingress.commandAccess.authorized,
		channelInfo,
		kind,
		chatType,
		channelName,
		channelDisplay,
		roomLabel
	};
}
//#endregion
export { resolveChannelMediaMaxBytes as C, warnMissingProviderGroupPolicyFallbackOnce as E, resolveAllowlistProviderRuntimeGroupPolicy as S, resolveDefaultGroupPolicy as T, logInboundDrop as _, resolveMattermostMonitorInboundAccess as a, readRequestBodyWithLimit as b, buildAgentMediaPayload as c, createChannelMessageReplyPipeline as d, createChannelPairingController as f, loadOutboundMediaFromUrl as g, listSkillCommandsForAgents as h, normalizeMattermostAllowList as i, buildModelsProviderData as l, isTrustedProxyAddress as m, isMattermostSenderAllowed as n, uniqueMattermostStrings as o, isRequestBodyLimitError as p, normalizeMattermostAllowEntry as r, DEFAULT_GROUP_HISTORY_LIMIT as s, authorizeMattermostCommandInvocation as t, createChannelHistoryWindow as u, logTypingFailure as v, resolveClientIp as w, registerPluginHttpRoute as x, parseStrictPositiveInteger as y };
