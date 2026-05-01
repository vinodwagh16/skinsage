import { Resend } from "resend";
import { config } from "../../config";

const resend = config.RESEND_API_KEY ? new Resend(config.RESEND_API_KEY) : null;

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!resend) { console.log(`[EMAIL STUB] To: ${to} | Subject: ${subject}`); return; }
  await resend.emails.send({ from: "SkinSage <noreply@skinsage.app>", to, subject, html });
}

export function buildWeeklyReportEmail(name: string, tips: string[]): string {
  const tipItems = tips.map(t => `<li style="margin-bottom:8px">${t}</li>`).join("");
  return `
    <div style="font-family:system-ui;max-width:600px;margin:0 auto;padding:24px;background:#0f172a;color:#f1f5f9">
      <h1 style="color:#6366f1">🌿 Your Weekly SkinSage Report</h1>
      <p>Hi ${name},</p>
      <p>Here are your personalized skin health tips for this week:</p>
      <ul>${tipItems}</ul>
      <p style="color:#94a3b8;font-size:13px">Remember: consistency is key. Keep following your routine!</p>
      <a href="${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/chat"
        style="display:inline-block;margin-top:16px;padding:10px 20px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px">
        Check Your Progress
      </a>
    </div>
  `;
}
