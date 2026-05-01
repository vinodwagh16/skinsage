import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { config } from "../config";
import { sendEmail, buildWeeklyReportEmail } from "./notifications/email";
import { sendSms, DAILY_NUDGE_TEMPLATES } from "./notifications/sms";
import { sendPush } from "./notifications/push";
import { db } from "../db/client";

const connection = new IORedis(config.REDIS_URL, { maxRetriesPerRequest: null });

export const notificationQueue = new Queue("notifications", {
  connection,
  defaultJobOptions: { attempts: 3, backoff: { type: "exponential", delay: 60000 } },
});

export function startNotificationWorker() {
  new Worker(
    "notifications",
    async (job) => {
      const { userId, type, template } = job.data;

      const userResult = await db.query(
        `SELECT name, email, phone, fcm_token FROM users WHERE id = $1`,
        [userId]
      );
      const user = userResult.rows[0];
      if (!user) return;

      if (type === "email" && user.email) {
        const html = buildWeeklyReportEmail(user.name, [template]);
        await sendEmail(user.email, "Your Weekly SkinSage Report", html);
      } else if (type === "sms" && user.phone) {
        const msg = DAILY_NUDGE_TEMPLATES[Math.floor(Math.random() * DAILY_NUDGE_TEMPLATES.length)];
        await sendSms(user.phone, msg);
      } else if (type === "push" && user.fcm_token) {
        await sendPush(user.fcm_token, "SkinSage", template);
      }

      await db.query(
        `UPDATE notification_jobs SET status = 'sent', sent_at = NOW()
         WHERE user_id = $1 AND type = $2 AND status = 'pending'`,
        [userId, type]
      );
    },
    { connection }
  );
}
