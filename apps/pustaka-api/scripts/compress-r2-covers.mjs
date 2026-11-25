#!/usr/bin/env node

import { appendFile } from "node:fs/promises";
import {
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import sharp from "sharp";

const COMPRESSED_METADATA_KEY = "compressed";
const COMPRESSED_VERSION = "v1";

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

function parsePositiveInt(value, fallback, name) {
  if (value === undefined || String(value).trim() === "") return fallback;
  const parsed = Number.parseInt(String(value).trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${name}: "${value}". Expected a positive integer.`);
  }
  return parsed;
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const sign = bytes < 0 ? "-" : "";
  let value = Math.abs(bytes);
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${sign}${value.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
}

function isNotFoundError(error) {
  return (
    error?.name === "NoSuchKey" ||
    error?.name === "NotFound" ||
    error?.$metadata?.httpStatusCode === 404
  );
}

function loadConfig() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();

  const missing = [];
  if (!accountId) missing.push("CLOUDFLARE_ACCOUNT_ID");
  if (!accessKeyId) missing.push("R2_ACCESS_KEY_ID");
  if (!secretAccessKey) missing.push("R2_SECRET_ACCESS_KEY");

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}`
    );
  }

  const maxWidth = parsePositiveInt(process.env.MAX_WIDTH, 1200, "MAX_WIDTH");
  const webpQuality = parsePositiveInt(
    process.env.WEBP_QUALITY,
    82,
    "WEBP_QUALITY"
  );
  if (webpQuality < 1 || webpQuality > 100) {
    throw new Error(
      `Invalid WEBP_QUALITY: "${webpQuality}". Expected an integer between 1 and 100.`
    );
  }

  const concurrency = parsePositiveInt(
    process.env.CONCURRENCY,
    5,
    "CONCURRENCY"
  );
  const limit = parsePositiveInt(process.env.LIMIT, null, "LIMIT");

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName: process.env.R2_BUCKET_NAME?.trim() || "pustaka-covers",
    prefix: process.env.R2_PREFIX ?? "covers/",
    maxWidth,
    webpQuality,
    concurrency,
    limit,
    dryRun: parseBoolean(process.env.DRY_RUN, false),
    force: parseBoolean(process.env.FORCE, false),
  };
}

async function listCoverKeys(s3, bucketName, prefix, limit) {
  const keys = [];
  let continuationToken;

  do {
    const response = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix || undefined,
        ContinuationToken: continuationToken,
      })
    );

    for (const item of response.Contents ?? []) {
      if (!item.Key || item.Key.endsWith("/") || (item.Size ?? 0) === 0) {
        continue;
      }
      keys.push(item.Key);
      if (limit !== null && keys.length >= limit) {
        return keys;
      }
    }

    continuationToken = response.IsTruncated
      ? response.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return keys;
}

async function compressToWebp(inputBuffer, { maxWidth, webpQuality }) {
  const metadata = await sharp(inputBuffer, {
    animated: true,
    failOn: "error",
  }).metadata();

  const isAnimated = (metadata.pages ?? 1) > 1;
  let pipeline = sharp(inputBuffer, {
    animated: isAnimated,
    failOn: "error",
  });

  // Auto-orient static images based on EXIF and strip EXIF metadata.
  if (!isAnimated) {
    pipeline = pipeline.rotate();
  }

  const outputBuffer = await pipeline
    .resize({
      width: maxWidth,
      withoutEnlargement: true,
    })
    .webp({
      quality: webpQuality,
      effort: 4,
    })
    .toBuffer();

  return { outputBuffer, isAnimated };
}

async function processObject(s3, key, config, stats) {
  let head;
  try {
    head = await s3.send(
      new HeadObjectCommand({
        Bucket: config.bucketName,
        Key: key,
      })
    );
  } catch (error) {
    if (isNotFoundError(error)) {
      stats.skippedMissing += 1;
      console.log(`[skip:missing] ${key}`);
      return;
    }
    throw error;
  }

  const existingMetadata = { ...(head.Metadata ?? {}) };
  if (!config.force && existingMetadata[COMPRESSED_METADATA_KEY]) {
    stats.skippedAlreadyCompressed += 1;
    return;
  }

  const contentType = (head.ContentType ?? "").toLowerCase();
  if (contentType && !contentType.startsWith("image/")) {
    stats.skippedNonImage += 1;
    console.log(`[skip:non-image] ${key} (${contentType})`);
    return;
  }

  let getResponse;
  try {
    getResponse = await s3.send(
      new GetObjectCommand({
        Bucket: config.bucketName,
        Key: key,
      })
    );
  } catch (error) {
    if (isNotFoundError(error)) {
      stats.skippedMissing += 1;
      console.log(`[skip:missing] ${key}`);
      return;
    }
    throw error;
  }

  if (!getResponse.Body) {
    stats.skippedMissing += 1;
    console.log(`[skip:empty] ${key}`);
    return;
  }

  const inputBuffer = Buffer.from(await getResponse.Body.transformToByteArray());
  const originalSize = inputBuffer.byteLength;
  if (originalSize === 0) {
    stats.skippedMissing += 1;
    console.log(`[skip:empty] ${key}`);
    return;
  }

  const { outputBuffer } = await compressToWebp(inputBuffer, config);
  const compressedSize = outputBuffer.byteLength;
  const profile = `webp-w${config.maxWidth}-q${config.webpQuality}`;
  const isAlreadyWebp = contentType === "image/webp";

  // Keep the smaller original if WebP conversion didn't shrink the object,
  // while still tagging it as processed so future runs skip it.
  if (compressedSize >= originalSize) {
    stats.keptOriginal += 1;
    console.log(
      `[keep] ${key} (${contentType || "unknown"}, ${formatBytes(originalSize)} -> ${formatBytes(compressedSize)} webp, not smaller)`
    );

    if (!config.dryRun) {
      await s3.send(
        new PutObjectCommand({
          Bucket: config.bucketName,
          Key: key,
          Body: inputBuffer,
          ContentType: head.ContentType || "application/octet-stream",
          Metadata: {
            ...existingMetadata,
            [COMPRESSED_METADATA_KEY]: COMPRESSED_VERSION,
            "compression-profile": profile,
            "compression-result": isAlreadyWebp
              ? "already-optimal-webp"
              : "kept-original",
          },
        })
      );
    }
    return;
  }

  const savedBytes = originalSize - compressedSize;
  const savedPct = ((savedBytes / originalSize) * 100).toFixed(1);
  stats.compressed += 1;
  stats.bytesBefore += originalSize;
  stats.bytesAfter += compressedSize;

  console.log(
    `[${config.dryRun ? "dry-run" : "compressed"}] ${key}: ${formatBytes(originalSize)} -> ${formatBytes(compressedSize)} (-${savedPct}%)`
  );

  if (!config.dryRun) {
    await s3.send(
      new PutObjectCommand({
        Bucket: config.bucketName,
        Key: key,
        Body: outputBuffer,
        ContentType: "image/webp",
        Metadata: {
          ...existingMetadata,
          [COMPRESSED_METADATA_KEY]: COMPRESSED_VERSION,
          "compression-profile": profile,
          "compression-result": "converted-webp",
          ...(existingMetadata["original-content-type"]
            ? {}
            : { "original-content-type": contentType || "unknown" }),
          ...(existingMetadata["original-size"]
            ? {}
            : { "original-size": String(originalSize) }),
        },
      })
    );
  }
}

async function runPool(items, concurrency, worker) {
  let nextIndex = 0;
  const runners = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        await worker(items[currentIndex]);
      }
    }
  );
  await Promise.all(runners);
}

async function writeStepSummary(config, stats, failures) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return;

  const savedBytes = stats.bytesBefore - stats.bytesAfter;
  const savedPct =
    stats.bytesBefore > 0
      ? ((savedBytes / stats.bytesBefore) * 100).toFixed(1)
      : "0.0";

  const lines = [
    `## Pustaka R2 Cover Compression ${config.dryRun ? "(Dry Run)" : ""}`,
    "",
    `- **Bucket**: \`${config.bucketName}\` (prefix \`${config.prefix || "(all)"}\`)`,
    `- **Settings**: WebP, max width \`${config.maxWidth}px\`, quality \`${config.webpQuality}\`${config.force ? ", **force=true**" : ""}`,
    "",
    "| Metric | Value |",
    "| --- | ---: |",
    `| Objects scanned | ${stats.scanned} |`,
    `| Compressed to WebP | ${stats.compressed} |`,
    `| Skipped (already compressed) | ${stats.skippedAlreadyCompressed} |`,
    `| Kept original (not smaller) | ${stats.keptOriginal} |`,
    `| Skipped (non-image / missing) | ${stats.skippedNonImage + stats.skippedMissing} |`,
    `| Failed | ${stats.failed} |`,
    `| Size before (compressed set) | ${formatBytes(stats.bytesBefore)} |`,
    `| Size after (compressed set) | ${formatBytes(stats.bytesAfter)} |`,
    `| Space saved | **${formatBytes(savedBytes)} (${savedPct}%)** |`,
    "",
  ];

  if (failures.length > 0) {
    lines.push("### Failures", "");
    for (const failure of failures) {
      lines.push(`- \`${failure.key}\`: ${failure.message}`);
    }
    lines.push("");
  }

  await appendFile(summaryPath, `${lines.join("\n")}\n`, "utf8");
}

async function main() {
  const config = loadConfig();

  console.log("Starting Pustaka R2 cover compression:", {
    bucketName: config.bucketName,
    prefix: config.prefix,
    maxWidth: config.maxWidth,
    webpQuality: config.webpQuality,
    concurrency: config.concurrency,
    limit: config.limit,
    dryRun: config.dryRun,
    force: config.force,
  });

  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    // Avoid AWS SDK v3 default flexible checksums that can cause issues with R2.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });

  const keys = await listCoverKeys(
    s3,
    config.bucketName,
    config.prefix,
    config.limit
  );

  const stats = {
    scanned: keys.length,
    compressed: 0,
    keptOriginal: 0,
    skippedAlreadyCompressed: 0,
    skippedNonImage: 0,
    skippedMissing: 0,
    failed: 0,
    bytesBefore: 0,
    bytesAfter: 0,
  };
  const failures = [];

  console.log(`Found ${keys.length} object(s) under "${config.prefix}".`);

  await runPool(keys, config.concurrency, async (key) => {
    try {
      await processObject(s3, key, config, stats);
    } catch (error) {
      stats.failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      failures.push({ key, message });
      console.error(`[error] ${key}: ${message}`);
    }
  });

  const savedBytes = stats.bytesBefore - stats.bytesAfter;
  const savedPct =
    stats.bytesBefore > 0
      ? ((savedBytes / stats.bytesBefore) * 100).toFixed(1)
      : "0.0";

  console.log("\n=== Summary ===");
  console.log(`Scanned:                    ${stats.scanned}`);
  console.log(`Compressed to WebP:         ${stats.compressed}`);
  console.log(`Kept original (not smaller):${stats.keptOriginal}`);
  console.log(`Skipped (already compressed):${stats.skippedAlreadyCompressed}`);
  console.log(
    `Skipped (non-image/missing):${stats.skippedNonImage + stats.skippedMissing}`
  );
  console.log(`Failed:                     ${stats.failed}`);
  console.log(
    `Saved:                      ${formatBytes(savedBytes)} (${savedPct}%)`
  );

  await writeStepSummary(config, stats, failures);

  if (stats.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
