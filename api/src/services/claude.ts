import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config";
import { SKIN_ANALYSIS_SYSTEM } from "../prompts/skin-analysis";

const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function* streamChatResponse(
  messages: ChatMessage[],
  systemPrompt: string = SKIN_ANALYSIS_SYSTEM
): AsyncGenerator<string> {
  const stream = await client.messages.stream({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    system: systemPrompt,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
  });

  for await (const chunk of stream) {
    if (
      chunk.type === "content_block_delta" &&
      chunk.delta.type === "text_delta"
    ) {
      yield chunk.delta.text;
    }
  }
}

export async function* streamVisionResponse(
  messages: any[],
  systemPrompt: string = SKIN_ANALYSIS_SYSTEM
): AsyncGenerator<string> {
  const stream = await client.messages.stream({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    system: systemPrompt,
    messages,
  });

  for await (const chunk of stream) {
    if (
      chunk.type === "content_block_delta" &&
      chunk.delta.type === "text_delta"
    ) {
      yield chunk.delta.text;
    }
  }
}

export async function generateRecommendations(
  sessionSummary: string,
  questionnaire: Record<string, string>
): Promise<string> {
  const questionnaireText = Object.entries(questionnaire)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: SKIN_ANALYSIS_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Skin concern summary: ${sessionSummary}\n\nLifestyle questionnaire answers:\n${questionnaireText}\n\nPlease provide the complete personalized skin health plan.`,
      },
    ],
  });

  return (response.content[0] as { text: string }).text;
}
