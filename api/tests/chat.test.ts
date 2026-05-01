import { buildSkinAnalysisMessage } from "../src/prompts/skin-analysis";

describe("skin analysis prompt builder", () => {
  it("builds text-only message", () => {
    const msg = buildSkinAnalysisMessage("I have dry skin");
    expect(msg.role).toBe("user");
    expect(msg.content).toBe("I have dry skin");
  });

  it("builds vision message with image", () => {
    const msg = buildSkinAnalysisMessage("check this", "base64data");
    expect(msg.role).toBe("user");
    expect(Array.isArray(msg.content)).toBe(true);
    const content = msg.content as any[];
    expect(content[0].type).toBe("image");
    expect(content[1].type).toBe("text");
  });
});
