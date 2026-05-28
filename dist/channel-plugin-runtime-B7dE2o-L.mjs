import { C as hasConfiguredSecretInput, S as buildSecretInputSchema, _ as normalizeMattermostBaseUrl, a as resolveMattermostReplyToMode, i as resolveMattermostAccount, n as listMattermostAccountIds, r as resolveDefaultMattermostAccountId, t as MATTERMOST_TEXT_CHUNK_LIMIT } from "./constants-lvhO5Lit.mjs";
import { t as resolveMattermostGatewayAuthBypassPaths } from "./gateway-auth-bypass-YVKSTzHp.mjs";
import { n as normalizeCompatibilityConfig, t as legacyConfigRules } from "./doctor-contract-CZW6FRgy.mjs";
import { n as collectRuntimeConfigAssignments, r as secretTargetRegistryEntries } from "./secret-contract-DsD3aKsP.mjs";
import { createChatChannelPlugin } from "openclaw/plugin-sdk/channel-core";
import { createChannelMessageAdapterFromOutbound } from "openclaw/plugin-sdk/channel-message";
import { createLoggedPairingApprovalNotifier } from "openclaw/plugin-sdk/channel-pairing";
import { createDangerousNameMatchingMutableAllowlistWarningCollector, createRestrictSendersChannelSecurity, resolveChannelGroupRequireMention } from "openclaw/plugin-sdk/channel-policy";
import { attachChannelToResult, createAttachedChannelResultAdapter } from "openclaw/plugin-sdk/channel-send-result";
import { createChannelDirectoryAdapter } from "openclaw/plugin-sdk/directory-runtime";
import { buildPassiveProbedChannelStatusSummary } from "openclaw/plugin-sdk/extension-shared";
import { normalizeMessagePresentation, renderMessagePresentationFallbackText } from "openclaw/plugin-sdk/interactive-runtime";
import { createLazyRuntimeModule } from "openclaw/plugin-sdk/lazy-runtime";
import { resolvePayloadMediaUrls, sendTextMediaPayload } from "openclaw/plugin-sdk/reply-payload";
import { isPrivateNetworkOptInEnabled } from "openclaw/plugin-sdk/ssrf-runtime";
import { createComputedAccountStatusAdapter, createDefaultChannelRuntimeState } from "openclaw/plugin-sdk/status-helpers";
import { normalizeLowercaseStringOrEmpty, normalizeOptionalString } from "openclaw/plugin-sdk/string-coerce-runtime";
import { createResolvedApproverActionAuthAdapter, resolveApprovalApprovers } from "openclaw/plugin-sdk/approval-auth-runtime";
import { describeAccountSnapshot } from "openclaw/plugin-sdk/account-helpers";
import { DEFAULT_ACCOUNT_ID, normalizeAccountId } from "openclaw/plugin-sdk/account-id";
import { z } from "zod";
import { createAccountStatusSink } from "openclaw/plugin-sdk/channel-lifecycle";
import { DEFAULT_ACCOUNT_ID as DEFAULT_ACCOUNT_ID$1, buildChannelOutboundSessionRoute, buildThreadAwareOutboundSessionRoute, stripChannelTargetPrefix, stripTargetKindPrefix } from "openclaw/plugin-sdk/core";
import { chunkTextForOutbound } from "openclaw/plugin-sdk/text-chunking";
import { formatNormalizedAllowFromEntries } from "openclaw/plugin-sdk/allow-from";
import { adaptScopedAccountAccessor, createScopedChannelConfigAdapter } from "openclaw/plugin-sdk/channel-config-helpers";
import { BlockStreamingCoalesceSchema, DmPolicySchema, GroupPolicySchema, MarkdownConfigSchema, buildChannelConfigSchema, requireOpenAllowFrom } from "openclaw/plugin-sdk/channel-config-primitives";
import { applyAccountNameToChannelSection, applySetupAccountConfigPatch, createSetupTranslator, createStandardChannelSetupStatus, formatDocsLink, migrateBaseNameToDefaultAccount } from "openclaw/plugin-sdk/setup";
import { createSetupInputPresenceValidator } from "openclaw/plugin-sdk/setup-runtime";
//#region src/approval-auth.ts
const MATTERMOST_USER_ID_RE = /^[a-z0-9]{26}$/;
function normalizeMattermostApproverId(value) {
	const lowered = normalizeLowercaseStringOrEmpty(String(value).trim().replace(/^(mattermost|user):/i, "").replace(/^@/, "").trim());
	return MATTERMOST_USER_ID_RE.test(lowered) ? lowered : void 0;
}
const mattermostApprovalAuth = createResolvedApproverActionAuthAdapter({
	channelLabel: "Mattermost",
	resolveApprovers: ({ cfg, accountId }) => {
		const account = resolveMattermostAccount({
			cfg,
			accountId
		}).config;
		return resolveApprovalApprovers({
			allowFrom: account.allowFrom,
			normalizeApprover: normalizeMattermostApproverId
		});
	},
	normalizeSenderId: (value) => normalizeMattermostApproverId(value)
});
//#endregion
//#region src/channel-config-shared.ts
const mattermostProMeta = {
	id: "mattermost-pro",
	label: "Mattermost",
	selectionLabel: "Mattermost (plugin)",
	detailLabel: "Mattermost Bot",
	docsPath: "/channels/mattermost",
	docsLabel: "mattermost-pro",
	blurb: "self-hosted Slack-style chat; install the plugin to enable.",
	systemImage: "bubble.left.and.bubble.right",
	order: 65,
	quickstartAllowFrom: true
};
function normalizeMattermostAllowEntry(entry) {
	return normalizeLowercaseStringOrEmpty(entry.trim().replace(/^(mattermost-pro|mm-pro|user):/i, "").replace(/^@/, ""));
}
function formatMattermostAllowEntry(entry) {
	const trimmed = entry.trim();
	if (!trimmed) return "";
	if (trimmed.startsWith("@")) {
		const username = trimmed.slice(1).trim();
		return username ? `@${normalizeLowercaseStringOrEmpty(username)}` : "";
	}
	return normalizeLowercaseStringOrEmpty(trimmed.replace(/^(mattermost-pro|mm-pro|user):/i, ""));
}
const mattermostProConfigAdapter = createScopedChannelConfigAdapter({
	sectionKey: "mattermost-pro",
	listAccountIds: listMattermostAccountIds,
	resolveAccount: adaptScopedAccountAccessor(resolveMattermostAccount),
	defaultAccountId: resolveDefaultMattermostAccountId,
	clearBaseFields: [
		"botToken",
		"baseUrl",
		"name"
	],
	resolveAllowFrom: (account) => account.config.allowFrom,
	formatAllowFrom: (allowFrom) => formatNormalizedAllowFromEntries({
		allowFrom,
		normalizeEntry: formatMattermostAllowEntry
	})
});
function isMattermostConfigured$1(account) {
	return Boolean(account.botToken && account.baseUrl);
}
function describeMattermostAccount(account) {
	return describeAccountSnapshot({
		account,
		configured: isMattermostConfigured$1(account),
		extra: {
			botTokenSource: account.botTokenSource,
			baseUrl: account.baseUrl
		}
	});
}
//#endregion
//#region src/config-schema-core.ts
const MattermostGroupSchema = z.object({ requireMention: z.boolean().optional() }).strict();
function requireMattermostOpenAllowFrom(params) {
	requireOpenAllowFrom({
		policy: params.policy,
		allowFrom: params.allowFrom,
		ctx: params.ctx,
		path: ["allowFrom"],
		message: "channels.mattermost-pro.dmPolicy=\"open\" requires channels.mattermost-pro.allowFrom to include \"*\""
	});
}
const DmChannelRetrySchema = z.object({
	/** Maximum number of retry attempts for DM channel creation (default: 3) */
	maxRetries: z.number().int().min(0).max(10).optional(),
	/** Initial delay in milliseconds before first retry (default: 1000) */
	initialDelayMs: z.number().int().min(100).max(6e4).optional(),
	/** Maximum delay in milliseconds between retries (default: 10000) */
	maxDelayMs: z.number().int().min(1e3).max(6e4).optional(),
	/** Timeout for each individual DM channel creation request in milliseconds (default: 30000) */
	timeoutMs: z.number().int().min(5e3).max(12e4).optional()
}).strict().refine((data) => {
	if (data.initialDelayMs !== void 0 && data.maxDelayMs !== void 0) return data.initialDelayMs <= data.maxDelayMs;
	return true;
}, {
	message: "initialDelayMs must be less than or equal to maxDelayMs",
	path: ["initialDelayMs"]
}).optional();
const MattermostSlashCommandsSchema = z.object({
	/** Enable native slash commands. "auto" resolves to false (opt-in). */
	native: z.union([z.boolean(), z.literal("auto")]).optional(),
	/** Also register skill-based commands. */
	nativeSkills: z.union([z.boolean(), z.literal("auto")]).optional(),
	/** Path for the callback endpoint on the gateway HTTP server. */
	callbackPath: z.string().optional(),
	/** Explicit callback URL (e.g. behind reverse proxy). */
	callbackUrl: z.string().optional()
}).strict().optional();
const MattermostNetworkSchema = z.object({ dangerouslyAllowPrivateNetwork: z.boolean().optional() }).strict().optional();
const MattermostStreamingModeSchema = z.enum([
	"off",
	"partial",
	"block",
	"progress"
]);
const MattermostStreamingProgressSchema = z.object({
	label: z.union([z.string(), z.literal(false)]).optional(),
	labels: z.array(z.string()).optional(),
	maxLines: z.number().int().positive().optional(),
	maxLineChars: z.number().int().positive().optional(),
	toolProgress: z.boolean().optional()
}).strict();
const MattermostStreamingPreviewSchema = z.object({ toolProgress: z.boolean().optional() }).strict();
const MattermostStreamingBlockSchema = z.object({
	enabled: z.boolean().optional(),
	coalesce: BlockStreamingCoalesceSchema.optional()
}).strict();
const MattermostStreamingSchema = z.union([
	MattermostStreamingModeSchema,
	z.boolean(),
	z.object({
		mode: MattermostStreamingModeSchema.optional(),
		chunkMode: z.enum(["length", "newline"]).optional(),
		preview: MattermostStreamingPreviewSchema.optional(),
		progress: MattermostStreamingProgressSchema.optional(),
		block: MattermostStreamingBlockSchema.optional()
	}).strict()
]);
const MattermostAccountSchemaBase = z.object({
	name: z.string().optional(),
	capabilities: z.array(z.string()).optional(),
	dangerouslyAllowNameMatching: z.boolean().optional(),
	markdown: MarkdownConfigSchema,
	enabled: z.boolean().optional(),
	configWrites: z.boolean().optional(),
	botToken: buildSecretInputSchema().optional(),
	baseUrl: z.string().optional(),
	chatmode: z.enum([
		"oncall",
		"onmessage",
		"onchar"
	]).optional(),
	oncharPrefixes: z.array(z.string()).optional(),
	requireMention: z.boolean().optional(),
	dmPolicy: DmPolicySchema.optional().default("pairing"),
	allowFrom: z.array(z.union([z.string(), z.number()])).optional(),
	groupAllowFrom: z.array(z.union([z.string(), z.number()])).optional(),
	groupPolicy: GroupPolicySchema.optional().default("allowlist"),
	textChunkLimit: z.number().int().positive().optional(),
	chunkMode: z.enum(["length", "newline"]).optional(),
	streaming: MattermostStreamingSchema.optional(),
	blockStreaming: z.boolean().optional(),
	blockStreamingCoalesce: BlockStreamingCoalesceSchema.optional(),
	replyToMode: z.enum([
		"off",
		"first",
		"all",
		"batched"
	]).optional(),
	responsePrefix: z.string().optional(),
	actions: z.object({ reactions: z.boolean().optional() }).optional(),
	commands: MattermostSlashCommandsSchema,
	interactions: z.object({
		callbackBaseUrl: z.string().optional(),
		allowedSourceIps: z.array(z.string()).optional()
	}).optional(),
	/** Per-group configuration (keyed by Mattermost channel ID or "*" for default). */
	groups: z.record(z.string(), MattermostGroupSchema.optional()).optional(),
	/** Network policy overrides for self-hosted Mattermost on trusted private/internal hosts. */
	network: MattermostNetworkSchema,
	/** Retry configuration for DM channel creation */
	dmChannelRetry: DmChannelRetrySchema
}).strict();
const MattermostAccountSchema = MattermostAccountSchemaBase.superRefine((value, ctx) => {
	requireMattermostOpenAllowFrom({
		policy: value.dmPolicy,
		allowFrom: value.allowFrom,
		ctx
	});
});
//#endregion
//#region src/config-surface.ts
const MattermostProChannelConfigSchema = buildChannelConfigSchema(MattermostAccountSchemaBase.extend({
	accounts: z.record(z.string(), MattermostAccountSchema.optional()).optional(),
	defaultAccount: z.string().optional()
}).superRefine((value, ctx) => {
	requireMattermostOpenAllowFrom({
		policy: value.dmPolicy,
		allowFrom: value.allowFrom,
		ctx
	});
}), { uiHints: {
	"": {
		label: "Mattermost",
		help: "Mattermost channel provider configuration for bot auth, access policy, slash commands, and preview streaming."
	},
	dmPolicy: {
		label: "Mattermost DM Policy",
		help: "Direct message access control (\"pairing\" recommended). \"open\" requires channels.mattermost-pro.allowFrom=[\"*\"]."
	},
	streaming: {
		label: "Mattermost Streaming Mode",
		help: "Unified Mattermost stream preview mode: \"off\" | \"partial\" | \"block\" | \"progress\". \"progress\" keeps a single editable progress draft until final delivery."
	},
	"streaming.mode": {
		label: "Mattermost Streaming Mode",
		help: "Canonical Mattermost preview mode: \"off\" | \"partial\" | \"block\" | \"progress\"."
	},
	"streaming.progress.label": {
		label: "Mattermost Progress Label",
		help: "Initial progress draft title. Use \"auto\" for built-in single-word labels, a custom string, or false to hide the title."
	},
	"streaming.progress.labels": {
		label: "Mattermost Progress Label Pool",
		help: "Candidate labels for streaming.progress.label=\"auto\". Leave unset to use OpenClaw built-in progress labels."
	},
	"streaming.progress.maxLines": {
		label: "Mattermost Progress Max Lines",
		help: "Maximum number of compact progress lines to keep below the draft label (default: 8)."
	},
	"streaming.progress.maxLineChars": {
		label: "Mattermost Progress Max Line Chars",
		help: "Maximum characters per compact progress line before truncation (default: 120). Prose cuts at word boundaries; commands and paths keep useful suffixes."
	},
	"streaming.progress.toolProgress": {
		label: "Mattermost Progress Tool Lines",
		help: "Show compact tool/progress lines in progress draft mode (default: true). Set false to keep only the label until final delivery."
	},
	"streaming.progress.commandText": {
		label: "Mattermost Progress Command Text",
		help: "Command/exec detail in progress draft lines: \"raw\" preserves released behavior; \"status\" shows only the tool label."
	},
	"streaming.preview.toolProgress": {
		label: "Mattermost Draft Tool Progress",
		help: "Show tool/progress activity in the live draft preview post (default: true). Set false to hide interim tool updates while the draft preview stays active."
	},
	"streaming.preview.commandText": {
		label: "Mattermost Draft Command Text",
		help: "Command/exec detail in preview tool-progress lines: \"raw\" preserves released behavior; \"status\" shows only the tool label."
	},
	"streaming.block.enabled": {
		label: "Mattermost Block Streaming Enabled",
		help: "Enable chunked block-style Mattermost preview delivery when channels.mattermost-pro.streaming.mode=\"block\"."
	},
	"streaming.block.coalesce": {
		label: "Mattermost Block Streaming Coalesce",
		help: "Merge streamed Mattermost block replies before final delivery."
	}
} });
//#endregion
//#region src/doctor.ts
function isMattermostMutableAllowEntry(raw) {
	const text = raw.trim();
	if (!text || text === "*") return false;
	const lowered = normalizeLowercaseStringOrEmpty(text.replace(/^(mattermost|user):/i, "").replace(/^@/, "").trim());
	if (/^[a-z0-9]{26}$/.test(lowered)) return false;
	return true;
}
const mattermostDoctor = {
	legacyConfigRules,
	normalizeCompatibilityConfig,
	collectMutableAllowlistWarnings: createDangerousNameMatchingMutableAllowlistWarningCollector({
		channel: "mattermost-pro",
		detector: isMattermostMutableAllowEntry,
		collectLists: (scope) => [{
			pathLabel: `${scope.prefix}.allowFrom`,
			list: scope.account.allowFrom
		}, {
			pathLabel: `${scope.prefix}.groupAllowFrom`,
			list: scope.account.groupAllowFrom
		}]
	})
};
//#endregion
//#region src/group-mentions.ts
function resolveMattermostGroupRequireMention(params) {
	const account = resolveMattermostAccount({
		cfg: params.cfg,
		accountId: params.accountId
	});
	const requireMentionOverride = typeof params.requireMentionOverride === "boolean" ? params.requireMentionOverride : account.requireMention;
	return resolveChannelGroupRequireMention({
		cfg: params.cfg,
		channel: "mattermost-pro",
		groupId: params.groupId,
		accountId: params.accountId,
		requireMentionOverride
	});
}
//#endregion
//#region src/normalize.ts
function normalizeMattermostMessagingTarget(raw) {
	const trimmed = raw.trim();
	if (!trimmed) return;
	const lower = normalizeLowercaseStringOrEmpty(trimmed);
	if (lower.startsWith("channel:")) {
		const id = trimmed.slice(8).trim();
		return id ? `channel:${id}` : void 0;
	}
	if (lower.startsWith("group:")) {
		const id = trimmed.slice(6).trim();
		return id ? `channel:${id}` : void 0;
	}
	if (lower.startsWith("user:")) {
		const id = trimmed.slice(5).trim();
		return id ? `user:${id}` : void 0;
	}
	if (lower.startsWith("mattermost-pro:")) {
		const id = trimmed.slice(15).trim();
		return id ? `user:${id}` : void 0;
	}
	if (lower.startsWith("mm-pro:")) {
		const id = trimmed.slice(7).trim();
		return id ? `user:${id}` : void 0;
	}
	if (trimmed.startsWith("@")) {
		const id = trimmed.slice(1).trim();
		return id ? `@${id}` : void 0;
	}
	if (trimmed.startsWith("#")) return;
}
function looksLikeMattermostTargetId(raw, _normalized) {
	const trimmed = raw.trim();
	if (!trimmed) return false;
	if (/^(user|channel|group|mattermost-pro|mm-pro):/i.test(trimmed)) return true;
	if (trimmed.startsWith("@")) return true;
	return /^[a-z0-9]{26}$/i.test(trimmed) || /^[a-z0-9]{26}__[a-z0-9]{26}$/i.test(trimmed);
}
//#endregion
//#region src/session-route.ts
function resolveMattermostOutboundSessionRoute(params) {
	let trimmed = stripChannelTargetPrefix(params.target, "mattermost-pro");
	trimmed = trimmed ? trimmed : stripChannelTargetPrefix(params.target, "mm-pro");
	if (!trimmed) return null;
	const lower = normalizeLowercaseStringOrEmpty(trimmed);
	const resolvedKind = params.resolvedTarget?.kind;
	const isUser = resolvedKind === "user" || resolvedKind !== "channel" && resolvedKind !== "group" && (lower.startsWith("user:") || trimmed.startsWith("@"));
	if (trimmed.startsWith("@")) trimmed = trimmed.slice(1).trim();
	const rawId = stripTargetKindPrefix(trimmed);
	if (!rawId) return null;
	return buildThreadAwareOutboundSessionRoute({
		route: buildChannelOutboundSessionRoute({
			cfg: params.cfg,
			agentId: params.agentId,
			channel: "mattermost-pro",
			accountId: params.accountId,
			peer: {
				kind: isUser ? "direct" : "channel",
				id: rawId
			},
			chatType: isUser ? "direct" : "channel",
			from: isUser ? `mattermost-pro:${rawId}` : `mattermost-pro:channel:${rawId}`,
			to: isUser ? `user:${rawId}` : `channel:${rawId}`
		}),
		replyToId: params.replyToId,
		threadId: params.threadId,
		currentSessionKey: params.currentSessionKey,
		canRecoverCurrentThread: ({ route }) => route.chatType !== "direct" || (params.cfg.session?.dmScope ?? "main") !== "main"
	});
}
//#endregion
//#region src/setup-core.ts
const channel$1 = "mattermost-pro";
function isMattermostConfigured(account) {
	return (Boolean(account.botToken?.trim()) || hasConfiguredSecretInput(account.config.botToken)) && Boolean(account.baseUrl);
}
function resolveMattermostAccountWithSecrets(cfg, accountId) {
	return resolveMattermostAccount({
		cfg,
		accountId,
		allowUnresolvedSecretRef: true
	});
}
function applyMattermostSetupConfigPatch(params) {
	const namedConfig = applyAccountNameToChannelSection({
		cfg: params.cfg,
		channelKey: channel$1,
		accountId: params.accountId,
		name: params.name
	});
	return applySetupAccountConfigPatch({
		cfg: params.accountId !== DEFAULT_ACCOUNT_ID ? migrateBaseNameToDefaultAccount({
			cfg: namedConfig,
			channelKey: channel$1
		}) : namedConfig,
		channelKey: channel$1,
		accountId: params.accountId,
		patch: params.patch
	});
}
const mattermostSetupAdapter = {
	resolveAccountId: ({ accountId }) => normalizeAccountId(accountId),
	applyAccountName: ({ cfg, accountId, name }) => applyAccountNameToChannelSection({
		cfg,
		channelKey: channel$1,
		accountId,
		name
	}),
	validateInput: createSetupInputPresenceValidator({
		defaultAccountOnlyEnvError: "Mattermost env vars can only be used for the default account.",
		whenNotUseEnv: [{
			someOf: ["botToken", "token"],
			message: "Mattermost requires --bot-token and --http-url (or --use-env)."
		}, {
			someOf: ["httpUrl"],
			message: "Mattermost requires --bot-token and --http-url (or --use-env)."
		}],
		validate: ({ input }) => {
			const token = input.botToken ?? input.token;
			const baseUrl = normalizeMattermostBaseUrl(input.httpUrl);
			if (!input.useEnv && (!token || !baseUrl)) return "Mattermost requires --bot-token and --http-url (or --use-env).";
			if (input.httpUrl && !baseUrl) return "Mattermost --http-url must include a valid base URL.";
			return null;
		}
	}),
	applyAccountConfig: ({ cfg, accountId, input }) => {
		const token = input.botToken ?? input.token;
		const baseUrl = normalizeMattermostBaseUrl(input.httpUrl);
		return applyMattermostSetupConfigPatch({
			cfg,
			accountId,
			name: input.name,
			patch: input.useEnv ? {} : {
				...token ? { botToken: token } : {},
				...baseUrl ? { baseUrl } : {}
			}
		});
	}
};
//#endregion
//#region src/setup-surface.ts
const t = createSetupTranslator();
const channel = "mattermost-pro";
const mattermostSetupWizard = {
	channel,
	status: createStandardChannelSetupStatus({
		channelLabel: "Mattermost",
		configuredLabel: t("wizard.channels.statusConfigured"),
		unconfiguredLabel: t("wizard.channels.statusNeedsTokenUrl"),
		configuredHint: t("wizard.channels.statusConfigured"),
		unconfiguredHint: t("wizard.channels.statusNeedsSetup"),
		configuredScore: 2,
		unconfiguredScore: 1,
		resolveConfigured: ({ cfg, accountId }) => isMattermostConfigured(resolveMattermostAccountWithSecrets(cfg, accountId ?? DEFAULT_ACCOUNT_ID))
	}),
	introNote: {
		title: t("wizard.mattermost.botTokenTitle"),
		lines: [
			t("wizard.mattermost.helpOpenConsole"),
			t("wizard.mattermost.helpCreateBot"),
			t("wizard.mattermost.helpBaseUrl"),
			t("wizard.mattermost.helpBotMember"),
			t("wizard.channels.docs", { link: formatDocsLink("/mattermost", "mattermost-pro") })
		],
		shouldShow: ({ cfg, accountId }) => !isMattermostConfigured(resolveMattermostAccountWithSecrets(cfg, accountId))
	},
	envShortcut: {
		prompt: t("wizard.mattermost.envPrompt"),
		preferredEnvVar: "MATTERMOST_BOT_TOKEN",
		isAvailable: ({ cfg, accountId }) => {
			if (accountId !== DEFAULT_ACCOUNT_ID) return false;
			const resolvedAccount = resolveMattermostAccountWithSecrets(cfg, accountId);
			const hasConfigValues = hasConfiguredSecretInput(resolvedAccount.config.botToken) || Boolean(resolvedAccount.config.baseUrl?.trim());
			return Boolean(process.env.MATTERMOST_BOT_TOKEN?.trim() && process.env.MATTERMOST_URL?.trim() && !hasConfigValues);
		},
		apply: ({ cfg, accountId }) => applySetupAccountConfigPatch({
			cfg,
			channelKey: channel,
			accountId,
			patch: {}
		})
	},
	credentials: [{
		inputKey: "botToken",
		providerHint: channel,
		credentialLabel: t("wizard.mattermost.botToken"),
		preferredEnvVar: "MATTERMOST_BOT_TOKEN",
		envPrompt: t("wizard.mattermost.envPrompt"),
		keepPrompt: t("wizard.mattermost.botTokenKeep"),
		inputPrompt: t("wizard.mattermost.botTokenInput"),
		inspect: ({ cfg, accountId }) => {
			const resolvedAccount = resolveMattermostAccountWithSecrets(cfg, accountId);
			return {
				accountConfigured: isMattermostConfigured(resolvedAccount),
				hasConfiguredValue: hasConfiguredSecretInput(resolvedAccount.config.botToken)
			};
		},
		applySet: async ({ cfg, accountId, value }) => applyMattermostSetupConfigPatch({
			cfg,
			accountId,
			patch: { botToken: value }
		})
	}],
	textInputs: [{
		inputKey: "httpUrl",
		message: t("wizard.mattermost.baseUrlPrompt"),
		confirmCurrentValue: false,
		currentValue: ({ cfg, accountId }) => resolveMattermostAccountWithSecrets(cfg, accountId).baseUrl ?? process.env.MATTERMOST_URL?.trim(),
		initialValue: ({ cfg, accountId }) => resolveMattermostAccountWithSecrets(cfg, accountId).baseUrl ?? process.env.MATTERMOST_URL?.trim(),
		shouldPrompt: ({ cfg, accountId, credentialValues, currentValue }) => {
			const resolvedAccount = resolveMattermostAccountWithSecrets(cfg, accountId);
			const tokenConfigured = Boolean(resolvedAccount.botToken?.trim()) || hasConfiguredSecretInput(resolvedAccount.config.botToken);
			return Boolean(credentialValues.botToken) || !tokenConfigured || !currentValue;
		},
		validate: ({ value }) => normalizeMattermostBaseUrl(value) ? void 0 : "Mattermost base URL must include a valid base URL.",
		normalizeValue: ({ value }) => normalizeMattermostBaseUrl(value) ?? value.trim(),
		applySet: async ({ cfg, accountId, value }) => applyMattermostSetupConfigPatch({
			cfg,
			accountId,
			patch: { baseUrl: value }
		})
	}],
	disable: (cfg) => ({
		...cfg,
		channels: {
			...cfg.channels,
			mattermost: {
				...cfg.channels?.["mattermost-pro"],
				enabled: false
			}
		}
	})
};
//#endregion
//#region src/channel.ts
const loadMattermostChannelRuntime = createLazyRuntimeModule(() => import("./channel.runtime-Dr_cBIVd.mjs"));
function buildMattermostPresentationButtons(presentation) {
	return presentation.blocks.filter((block) => block.type === "buttons").map((block) => block.buttons.flatMap((button) => button.value ? [{
		text: button.label,
		callback_data: button.value,
		style: button.style
	}] : []));
}
const MATTERMOST_PRESENTATION_CAPABILITIES = {
	supported: true,
	buttons: true,
	selects: false,
	context: true,
	divider: false,
	limits: { text: { markdownDialect: "markdown" } }
};
function hasMattermostPresentationButtons(presentation) {
	return buildMattermostPresentationButtons(presentation).some((row) => row.length > 0);
}
function readMattermostPresentationButtons(payload) {
	const buttons = (payload.channelData?.mattermost)?.presentationButtons;
	return Array.isArray(buttons) ? buttons : void 0;
}
const mattermostSecurityAdapter = createRestrictSendersChannelSecurity({
	channelKey: "mattermost-pro",
	resolveDmPolicy: (account) => account.config.dmPolicy,
	resolveDmAllowFrom: (account) => account.config.allowFrom,
	resolveGroupPolicy: (account) => account.config.groupPolicy,
	surface: "Mattermost channels",
	openScope: "any member",
	groupPolicyPath: "channels.mattermost-pro.groupPolicy",
	groupAllowFromPath: "channels.mattermost-pro.groupAllowFrom",
	policyPathSuffix: "dmPolicy",
	normalizeDmEntry: (raw) => normalizeMattermostAllowEntry(raw)
});
function describeMattermostMessageTool({ cfg, accountId }) {
	const enabledAccounts = (accountId ? [resolveMattermostAccount({
		cfg,
		accountId
	})] : listMattermostAccountIds(cfg).map((listedAccountId) => resolveMattermostAccount({
		cfg,
		accountId: listedAccountId
	}))).filter((account) => account.enabled).filter((account) => Boolean(account.botToken?.trim() && account.baseUrl?.trim()));
	const actions = [];
	if (enabledAccounts.length > 0) actions.push("send");
	const baseReactions = (cfg.channels?.["mattermost-pro"]?.actions)?.reactions;
	if (enabledAccounts.some((account) => {
		return account.config.actions?.reactions ?? baseReactions ?? true;
	})) actions.push("react");
	return {
		actions,
		capabilities: enabledAccounts.length > 0 ? ["presentation"] : []
	};
}
function hasConfiguredMattermostDirectoryAccount({ cfg, accountId }) {
	return (accountId ? [resolveMattermostAccount({
		cfg,
		accountId
	})] : listMattermostAccountIds(cfg).map((listedAccountId) => resolveMattermostAccount({
		cfg,
		accountId: listedAccountId
	}))).some((account) => Boolean(account.enabled && account.botToken?.trim() && account.baseUrl?.trim()));
}
async function listMattermostDirectoryGroups(params) {
	if (!hasConfiguredMattermostDirectoryAccount(params)) return [];
	return (await loadMattermostChannelRuntime()).listMattermostDirectoryGroups(params);
}
async function listMattermostDirectoryPeers(params) {
	if (!hasConfiguredMattermostDirectoryAccount(params)) return [];
	return (await loadMattermostChannelRuntime()).listMattermostDirectoryPeers(params);
}
const mattermostMessageActions = {
	describeMessageTool: describeMattermostMessageTool,
	supportsAction: ({ action }) => {
		return action === "send" || action === "react";
	},
	handleAction: async ({ action, params, cfg, accountId }) => {
		if (action === "react") {
			const resolvedAccountId = accountId ?? resolveDefaultMattermostAccountId(cfg);
			const mattermostConfig = cfg.channels?.["mattermost-pro"];
			if (!(resolveMattermostAccount({
				cfg,
				accountId: resolvedAccountId
			}).config.actions?.reactions ?? mattermostConfig?.actions?.reactions ?? true)) throw new Error("Mattermost reactions are disabled in config");
			const { postId, emojiName, remove } = parseMattermostReactActionParams(params);
			if (remove) {
				const result = await (await loadMattermostChannelRuntime()).removeMattermostReaction({
					cfg,
					postId,
					emojiName,
					accountId: resolvedAccountId
				});
				if (!result.ok) throw new Error(result.error);
				return {
					content: [{
						type: "text",
						text: `Removed reaction :${emojiName}: from ${postId}`
					}],
					details: {}
				};
			}
			const result = await (await loadMattermostChannelRuntime()).addMattermostReaction({
				cfg,
				postId,
				emojiName,
				accountId: resolvedAccountId
			});
			if (!result.ok) throw new Error(result.error);
			return {
				content: [{
					type: "text",
					text: `Reacted with :${emojiName}: on ${postId}`
				}],
				details: {}
			};
		}
		if (action !== "send") throw new Error(`Unsupported Mattermost action: ${action}`);
		const to = typeof params.to === "string" ? params.to.trim() : typeof params.target === "string" ? params.target.trim() : "";
		if (!to) throw new Error("Mattermost send requires a target (to).");
		const presentation = normalizeMessagePresentation(params.presentation);
		const message = presentation ? renderMessagePresentationFallbackText({
			text: typeof params.message === "string" ? params.message : "",
			presentation
		}) : typeof params.message === "string" ? params.message : "";
		const replyToId = normalizeOptionalString(params.replyToId) ?? normalizeOptionalString(params.replyTo);
		const resolvedAccountId = accountId || void 0;
		const mediaUrl = typeof params.media === "string" ? params.media.trim() || void 0 : void 0;
		const result = await (await loadMattermostChannelRuntime()).sendMessageMattermost(to, message, {
			cfg,
			accountId: resolvedAccountId,
			replyToId,
			buttons: presentation ? buildMattermostPresentationButtons(presentation) : void 0,
			attachmentText: typeof params.attachmentText === "string" ? params.attachmentText : void 0,
			mediaUrl
		});
		return {
			content: [{
				type: "text",
				text: JSON.stringify({
					ok: true,
					channel: "mattermost-pro",
					messageId: result.messageId,
					channelId: result.channelId
				})
			}],
			details: {}
		};
	}
};
function parseMattermostReactActionParams(params) {
	const postId = normalizeOptionalString(params.messageId) ?? normalizeOptionalString(params.postId);
	if (!postId) throw new Error("Mattermost react requires messageId (post id)");
	const emojiName = normalizeOptionalString(params.emoji)?.replace(/^:+|:+$/g, "");
	if (!emojiName) throw new Error("Mattermost react requires emoji");
	return {
		postId,
		emojiName,
		remove: params.remove === true
	};
}
const mattermostOutbound = {
	deliveryMode: "direct",
	chunker: chunkTextForOutbound,
	chunkerMode: "markdown",
	textChunkLimit: MATTERMOST_TEXT_CHUNK_LIMIT,
	deliveryCapabilities: { durableFinal: {
		text: true,
		media: true,
		payload: true,
		replyTo: true,
		thread: true,
		messageSendingHooks: true
	} },
	presentationCapabilities: MATTERMOST_PRESENTATION_CAPABILITIES,
	renderPresentation: ({ payload, presentation }) => {
		if (payload.mediaUrls && payload.mediaUrls.length > 1) return null;
		const buttons = buildMattermostPresentationButtons(presentation);
		if (!hasMattermostPresentationButtons(presentation)) return null;
		return {
			...payload,
			text: renderMessagePresentationFallbackText({
				text: payload.text,
				presentation
			}),
			channelData: {
				...payload.channelData,
				mattermost: {
					...payload.channelData?.mattermost,
					presentationButtons: buttons
				}
			}
		};
	},
	sendPayload: async (ctx) => {
		const buttons = readMattermostPresentationButtons(ctx.payload);
		if (buttons?.length) {
			const mediaUrl = resolvePayloadMediaUrls({
				...ctx.payload,
				mediaUrl: ctx.payload.mediaUrl ?? ctx.mediaUrl
			}).map((url) => url.trim()).find(Boolean);
			return attachChannelToResult("mattermost-pro", await (await loadMattermostChannelRuntime()).sendMessageMattermost(ctx.to, ctx.payload.text ?? ctx.text, {
				cfg: ctx.cfg,
				accountId: ctx.accountId ?? void 0,
				mediaUrl,
				mediaLocalRoots: ctx.mediaLocalRoots,
				mediaReadFile: ctx.mediaReadFile,
				replyToId: ctx.replyToId ?? (ctx.threadId != null ? String(ctx.threadId) : void 0),
				buttons
			}));
		}
		return await sendTextMediaPayload({
			channel: "mattermost-pro",
			ctx,
			adapter: mattermostOutbound
		});
	},
	resolveTarget: ({ to }) => {
		const trimmed = to?.trim();
		if (!trimmed) return {
			ok: false,
			error: /* @__PURE__ */ new Error("Delivering to Mattermost requires --to <channelId|@username|user:ID|channel:ID>")
		};
		return {
			ok: true,
			to: trimmed
		};
	},
	...createAttachedChannelResultAdapter({
		channel: "mattermost-pro",
		sendText: async ({ cfg, to, text, accountId, replyToId, threadId }) => await (await loadMattermostChannelRuntime()).sendMessageMattermost(to, text, {
			cfg,
			accountId: accountId ?? void 0,
			replyToId: replyToId ?? (threadId != null ? String(threadId) : void 0)
		}),
		sendMedia: async ({ cfg, to, text, mediaUrl, mediaLocalRoots, accountId, replyToId, threadId }) => await (await loadMattermostChannelRuntime()).sendMessageMattermost(to, text, {
			cfg,
			accountId: accountId ?? void 0,
			mediaUrl,
			mediaLocalRoots,
			replyToId: replyToId ?? (threadId != null ? String(threadId) : void 0)
		})
	})
};
const mattermostMessageAdapter = createChannelMessageAdapterFromOutbound({
	id: "mattermost-pro",
	outbound: mattermostOutbound,
	live: {
		capabilities: {
			draftPreview: true,
			previewFinalization: true,
			progressUpdates: true
		},
		finalizer: { capabilities: {
			finalEdit: true,
			normalFallback: true,
			discardPending: true
		} }
	}
});
const mattermostProPlugin = createChatChannelPlugin({
	base: {
		id: "mattermost-pro",
		meta: { ...mattermostProMeta },
		setup: mattermostSetupAdapter,
		setupWizard: mattermostSetupWizard,
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
		streaming: { blockStreamingCoalesceDefaults: {
			minChars: 1500,
			idleMs: 1e3
		} },
		reload: { configPrefixes: ["channels.mattermost-pro"] },
		configSchema: MattermostProChannelConfigSchema,
		config: {
			...mattermostProConfigAdapter,
			isConfigured: isMattermostConfigured$1,
			describeAccount: describeMattermostAccount
		},
		approvalCapability: mattermostApprovalAuth,
		doctor: mattermostDoctor,
		groups: { resolveRequireMention: resolveMattermostGroupRequireMention },
		actions: mattermostMessageActions,
		message: mattermostMessageAdapter,
		secrets: {
			secretTargetRegistryEntries,
			collectRuntimeConfigAssignments
		},
		directory: createChannelDirectoryAdapter({
			listGroups: listMattermostDirectoryGroups,
			listGroupsLive: listMattermostDirectoryGroups,
			listPeers: listMattermostDirectoryPeers,
			listPeersLive: listMattermostDirectoryPeers
		}),
		messaging: {
			targetPrefixes: ["mattermost-pro", "mm-pro"],
			defaultMarkdownTableMode: "off",
			normalizeTarget: normalizeMattermostMessagingTarget,
			resolveDeliveryTarget: ({ conversationId, parentConversationId }) => {
				const parent = parentConversationId?.trim();
				const child = conversationId.trim();
				return parent && parent !== child ? {
					to: `channel:${parent}`,
					threadId: child
				} : { to: normalizeMattermostMessagingTarget(`channel:${child}`) };
			},
			resolveOutboundSessionRoute: (params) => resolveMattermostOutboundSessionRoute(params),
			targetResolver: {
				looksLikeId: looksLikeMattermostTargetId,
				hint: "<channelId|user:ID|channel:ID>",
				resolveTarget: async ({ cfg, accountId, input }) => {
					const resolved = await (await loadMattermostChannelRuntime()).resolveMattermostOpaqueTarget({
						input,
						cfg,
						accountId
					});
					if (!resolved) return null;
					return {
						to: resolved.to,
						kind: resolved.kind,
						source: "directory"
					};
				}
			}
		},
		status: createComputedAccountStatusAdapter({
			defaultRuntime: createDefaultChannelRuntimeState(DEFAULT_ACCOUNT_ID$1, {
				connected: false,
				lastConnectedAt: null,
				lastDisconnect: null
			}),
			buildChannelSummary: ({ snapshot }) => buildPassiveProbedChannelStatusSummary(snapshot, {
				botTokenSource: snapshot.botTokenSource ?? "none",
				connected: snapshot.connected ?? false,
				baseUrl: snapshot.baseUrl ?? null
			}),
			probeAccount: async ({ account, timeoutMs }) => {
				const token = account.botToken?.trim();
				const baseUrl = account.baseUrl?.trim();
				if (!token || !baseUrl) return {
					ok: false,
					error: "bot token or baseUrl missing"
				};
				return await (await loadMattermostChannelRuntime()).probeMattermost(baseUrl, token, timeoutMs, isPrivateNetworkOptInEnabled(account.config));
			},
			resolveAccountSnapshot: ({ account, runtime }) => ({
				accountId: account.accountId,
				name: account.name,
				enabled: account.enabled,
				configured: Boolean(account.botToken && account.baseUrl),
				extra: {
					botTokenSource: account.botTokenSource,
					baseUrl: account.baseUrl,
					connected: runtime?.connected ?? false,
					lastConnectedAt: runtime?.lastConnectedAt ?? null,
					lastDisconnect: runtime?.lastDisconnect ?? null
				}
			})
		}),
		gateway: {
			resolveGatewayAuthBypassPaths: ({ cfg }) => resolveMattermostGatewayAuthBypassPaths(cfg),
			startAccount: async (ctx) => {
				const account = ctx.account;
				const statusSink = createAccountStatusSink({
					accountId: ctx.accountId,
					setStatus: ctx.setStatus
				});
				statusSink({
					baseUrl: account.baseUrl,
					botTokenSource: account.botTokenSource
				});
				ctx.log?.info(`[${account.accountId}] starting channel`);
				return (await loadMattermostChannelRuntime()).monitorMattermostProvider({
					botToken: account.botToken ?? void 0,
					baseUrl: account.baseUrl ?? void 0,
					accountId: account.accountId,
					config: ctx.cfg,
					runtime: ctx.runtime,
					abortSignal: ctx.abortSignal,
					statusSink
				});
			}
		}
	},
	pairing: { text: {
		idLabel: "mattermostUserId",
		message: "OpenClaw: your access has been approved.",
		normalizeAllowEntry: (entry) => normalizeMattermostAllowEntry(entry),
		notify: createLoggedPairingApprovalNotifier(({ id }) => `[mattermost-pro] User ${id} approved for pairing`)
	} },
	threading: {
		scopedAccountReplyToMode: {
			resolveAccount: (cfg, accountId) => resolveMattermostAccount({
				cfg,
				accountId: accountId ?? resolveDefaultMattermostAccountId(cfg)
			}),
			resolveReplyToMode: (account, chatType) => resolveMattermostReplyToMode(account, chatType === "direct" || chatType === "group" || chatType === "channel" ? chatType : "channel")
		},
		resolveReplyTransport: ({ threadId, replyToId }) => ({
			replyToId: replyToId ?? (threadId != null ? String(threadId) : void 0),
			threadId
		})
	},
	security: mattermostSecurityAdapter,
	outbound: mattermostOutbound
});
//#endregion
export { describeMattermostAccount as a, mattermostProMeta as c, MattermostProChannelConfigSchema as i, mattermostSetupWizard as n, isMattermostConfigured$1 as o, mattermostSetupAdapter as r, mattermostProConfigAdapter as s, mattermostProPlugin as t };
