import { describe, expect, it } from "vitest";
import { mattermostProPlugin } from "./channel.js";

describe("mattermostProPlugin", () => {
  it("owns the independent mattermost-pro channel config surface", () => {
    expect(mattermostProPlugin.id).toBe("mattermost-pro");
    expect(mattermostProPlugin.meta.id).toBe("mattermost-pro");
    expect(mattermostProPlugin.reload?.configPrefixes).toEqual(["channels.mattermost-pro"]);
    expect(mattermostProPlugin.messaging?.targetPrefixes).toContain("mattermost-pro");
    expect(mattermostProPlugin.messaging?.targetPrefixes).toContain("mm-pro");
  });
});
