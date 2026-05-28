import { describe, expect, it } from "vitest";
import { mattermostProPlugin } from "./channel.js";
import { shouldUpdateMattermostDraftFromAssistantPartial } from "./mattermost/monitor.js";

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
});
