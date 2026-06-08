import { parentPort } from "node:worker_threads";
import { createReadStream, promises as fs } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import ffmpeg from "fluent-ffmpeg";
import type { MediaData } from "./index";

export interface WorkerInput {
  filePath: string;
  relativePath: string;
  isVideo: boolean;
}

export interface WorkerOutput {
  sha1Str: string;
  mediaData: MediaData;
}

const READ_BUFFER_SIZE = 1024 * 1024; // 1MB

// For some reason, fluent-ffmpeg doesn't resolve ffprobe path correctly in worker threads, so we do it manually here
function resolveFfprobePath() {
	const envPath = process.env.FFPROBE_PATH;
	if (envPath) return envPath;

	const command = process.platform === "win32" ? "where.exe" : "which";
	const result = spawnSync(command, ["ffprobe"], { encoding: "utf8" });

	if (result.status === 0) {
		const resolvedPath = result.stdout
			.split(/\r?\n/)
			.map(line => line.trim())
			.find(Boolean);

		if (resolvedPath) return resolvedPath;
	}

	return "ffprobe";
}
ffmpeg.setFfprobePath(resolveFfprobePath());

function computeSha1(filePath: string) {
	return new Promise<Uint8Array>((resolve, reject) => {
		const hashSum = createHash("sha1");
		const stream = createReadStream(filePath, {
			highWaterMark: READ_BUFFER_SIZE,
		});
		stream.pipe(hashSum);
		hashSum.on("finish", () => {
			resolve(hashSum.digest());
		});
		stream.on("error", reject);
	});
}

async function processFile(
	filePath: string,
	relativePath: string,
	isVideo: boolean
): Promise<WorkerOutput> {
	const sha1 = await computeSha1(filePath);
	const stat = await fs.stat(filePath);

	return new Promise((resolve, reject) => {
		ffmpeg.ffprobe(filePath, (err, metadata) => {
			if (err) {
				reject(err);
				return;
			}

			resolve({
        sha1Str: Buffer.from(sha1).toString("hex"),
        mediaData: {
          path: relativePath,
          size: stat.size,
          sha1,
          width: metadata.streams[0]?.width,
          height: metadata.streams[0]?.height,
          duration: isVideo ? metadata.format.duration : 0,
        }
			});
		});
	});
}

if (parentPort) {
	parentPort.on("message", async (message: WorkerInput) => {
		try {
			const result = await processFile(
				message.filePath,
				message.relativePath,
				message.isVideo,
			);
			parentPort?.postMessage({ success: true, result });
		} catch (error) {
			parentPort?.postMessage({ success: false, error: String(error) });
		}
	});
}

