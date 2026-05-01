import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { config } from "../config";

const s3 = config.R2_ENDPOINT
  ? new S3Client({
      region: "auto",
      endpoint: config.R2_ENDPOINT,
      credentials: {
        accessKeyId: config.R2_ACCESS_KEY ?? "",
        secretAccessKey: config.R2_SECRET_KEY ?? "",
      },
    })
  : null;

export async function uploadImage(buffer: Buffer, key: string, mimeType: string): Promise<string> {
  if (!s3 || !config.R2_BUCKET) {
    console.log(`[STORAGE STUB] Would upload ${key}`);
    return `https://placeholder.skinsage.app/${key}`;
  }
  await s3.send(
    new PutObjectCommand({ Bucket: config.R2_BUCKET, Key: key, Body: buffer, ContentType: mimeType })
  );
  return `${config.R2_ENDPOINT}/${config.R2_BUCKET}/${key}`;
}
