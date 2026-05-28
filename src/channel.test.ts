import { describe, expect, it } from "vitest";
import type { ReplyPayload } from "openclaw/plugin-sdk/reply-runtime";
import { mattermostProPlugin } from "./channel.js";
import type { MattermostClient } from "./mattermost/client.js";
import {
  buildMattermostInboundReplayKeysForTest,
  deliverMattermostReplyWithDraftPreview,
  normalizeMattermostInteractionSourceIps,
  shouldUpdateMattermostDraftFromAssistantPartial,
  shouldUseMattermostBlockDraftPreview,
} from "./mattermost/monitor.js";
import { normalizeMattermostAllowList } from "./mattermost/monitor-auth.js";

describe("mattermostProPlugin", () => {
  it("owns the independent mattermost-pro channel config surface", () => {
    expect(mattermostProPlugin.id).toBe("mattermost-pro");
    expect(mattermostProPlugin.meta.id).toBe("mattermost-pro");
    expect(mattermostProPlugin.reload?.configPrefixes).toEqual(["channels.mattermost-pro"]);
    expect(mattermostProPlugin.messaging?.targetPrefixes).toContain("mattermost-pro");
    expect(mattermostProPlugin.messaging?.targetPrefixes).toContain("mm-pro");
  });
});

describe("Mattermost block streaming draft preview", () => {
  it("does not copy assistant answer partials into the preserved progress draft", () => {
    expect(shouldUpdateMattermostDraftFromAssistantPartial("block")).toBe(false);
    expect(shouldUpdateMattermostDraftFromAssistantPartial("partial")).toBe(true);
    expect(shouldUpdateMattermostDraftFromAssistantPartial("progress")).toBe(false);
    expect(shouldUpdateMattermostDraftFromAssistantPartial("off")).toBe(false);
  });

  it("uses block draft behavior for OpenClaw block streaming config", () => {
    expect(
      shouldUseMattermostBlockDraftPreview({
        streamingMode: "partial",
        blockStreaming: true,
      }),
    ).toBe(true);
  });

  it("sends the final answer normally instead of editing the preserved draft", async () => {
    const calls: string[] = [];
    const delivered: ReplyPayload[] = [];
    const client = {
      request: async () => {
        calls.push("edit");
        return {};
      },
    } as MattermostClient;

    await deliverMattermostReplyWithDraftPreview({
      payload: { text: "final answer" },
      info: { kind: "final" },
      kind: "channel",
      client,
      draftStream: {
        flush: async () => {
          calls.push("flush");
        },
        postId: () => "draft-post-id",
        clear: async () => {
          calls.push("clear");
        },
        discardPending: async () => {
          calls.push("discard");
        },
        seal: async () => {
          calls.push("seal");
        },
      },
      effectiveReplyToId: "thread-root",
      resolvePreviewFinalText: (text) => text,
      previewState: { finalizedViaPreviewPost: false },
      preserveDraftAfterNormalFinal: true,
      logVerboseMessage: () => {},
      deliverPayload: async (payload) => {
        calls.push("deliver");
        delivered.push(payload);
      },
    });

    expect(calls).toEqual(["flush", "seal", "deliver"]);
    expect(delivered).toEqual([{ text: "final answer" }]);
  });
});

describe("Mattermost runtime compatibility", () => {
  it("normalizes interaction source IPs without newer OpenClaw string-list exports", () => {
    expect(normalizeMattermostInteractionSourceIps([" 10.0.0.1 ", "", " 192.168.1.1 "])).toEqual([
      "10.0.0.1",
      "192.168.1.1",
    ]);
  });

  it("deduplicates allowlist entries without newer OpenClaw uniqueStrings export", () => {
    expect(normalizeMattermostAllowList([" @Alice ", "alice", "user:Bob", "mattermost:bob"])).toEqual([
      "alice",
      "bob",
    ]);
  });

  it("deduplicates inbound replay keys without newer OpenClaw uniqueStrings export", () => {
    expect(
      buildMattermostInboundReplayKeysForTest({
        accountId: "default",
        messageIds: [" post-1 ", "post-1", ""],
      }),
    ).toEqual(["default:post-1"]);
  });
});
