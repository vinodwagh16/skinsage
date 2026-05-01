import twilio from "twilio";
import { config } from "../../config";

const client =
  config.TWILIO_ACCOUNT_SID && config.TWILIO_AUTH_TOKEN
    ? twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN)
    : null;

export async function sendSms(to: string, body: string): Promise<void> {
  if (!client || !config.TWILIO_PHONE_NUMBER) {
    console.log(`[SMS STUB] To: ${to} | Body: ${body}`);
    return;
  }
  await client.messages.create({ body, from: config.TWILIO_PHONE_NUMBER, to });
}

export const DAILY_NUDGE_TEMPLATES = [
  "🌿 SkinSage reminder: Did you apply sunscreen today? Protect your skin!",
  "💧 SkinSage reminder: Stay hydrated! Your skin will thank you.",
  "🌙 SkinSage reminder: Don't forget your night skincare routine before bed.",
  "🥗 SkinSage reminder: Eating antioxidant-rich foods today helps your skin glow!",
  "😴 SkinSage reminder: Good sleep = great skin. Aim for 7-8 hours tonight.",
];
