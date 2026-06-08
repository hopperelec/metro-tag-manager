import { promises as fs } from "node:fs";
import path from "node:path";
import {
	EXCLUDED_FILES,
	EXCLUDED_FOLDERS,
	MEDIAS_PATH,
	VALID_EXTENSIONS,
	VIDEO_EXTENSIONS,
} from "$lib/constants";
import prisma from "$lib/server/prisma";
import { SingleBar } from "cli-progress";
import { Worker } from "node:worker_threads";
import type { WorkerInput, WorkerOutput } from "$lib/server/scan/worker";

export interface MediaData {
	path: string;
	size: number;
	sha1: Uint8Array;
	width: number | undefined;
	height: number | undefined;
	duration: number | undefined;
}

function compareHashes(a: Uint8Array, b: Uint8Array) {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false;
	}
	return true;
}

const NUM_WORKERS = 4;

class WorkerPool {
	private workers: Worker[] = [];
	private taskQueue: Array<{
		filePath: string;
		relativePath: string;
		ext: string;
		resolve: (value: WorkerOutput) => void;
		reject: (error: Error) => void;
	}> = [];
	private activeWorkers = new Set<Worker>();

	constructor(workerScript: string, numWorkers: number) {
		const workerPath = new URL(workerScript, import.meta.url);
		for (let i = 0; i < numWorkers; i++) {
			const worker = new Worker(workerPath);
			this.workers.push(worker);
		}
	}

	async processFile(
		filePath: string,
		relativePath: string,
		ext: string
	): Promise<WorkerOutput> {
		return new Promise((resolve, reject) => {
			this.taskQueue.push({ filePath, relativePath, ext, resolve, reject });
			this.processTasks();
		});
	}

	private processTasks() {
		while (this.taskQueue.length > 0 && this.activeWorkers.size < this.workers.length) {
			const worker = this.workers.find((w) => !this.activeWorkers.has(w));
			if (!worker) break;

			const task = this.taskQueue.shift();
			if (!task) break;

			this.activeWorkers.add(worker);

			const messageHandler = (message: {
				success: boolean;
				result?: any;
				error?: string;
			}) => {
				this.activeWorkers.delete(worker);
				worker.removeListener("message", messageHandler);
				worker.removeListener("error", errorHandler);

				if (message.success) {
					task.resolve(message.result as WorkerOutput);
				} else {
					task.reject(new Error(message.error || "Unknown error"));
				}

				this.processTasks();
			};

			const errorHandler = (error: Error) => {
				this.activeWorkers.delete(worker);
				worker.removeListener("message", messageHandler);
				worker.removeListener("error", errorHandler);
				task.reject(error);
				this.processTasks();
			};

			worker.on("message", messageHandler);
			worker.on("error", errorHandler);

			worker.postMessage({
				filePath: path.join(MEDIAS_PATH, task.filePath),
				relativePath: task.relativePath,
				isVideo: VIDEO_EXTENSIONS.includes(task.ext),
			} satisfies WorkerInput);
		}
	}

	async terminate() {
		await Promise.all(this.workers.map((w) => w.terminate()));
	}
}

export default async function scanAndSave() {
	const dbMedias = await prisma.media.findMany({
		select: { path: true, sha1: true, exists: true },
	});
  const knownPaths = new Set(dbMedias.map((media) => media.path));

  const files = await fs.readdir(MEDIAS_PATH, { recursive: true });
  const validFiles = files
    .filter((file) => {
      return (
        !EXCLUDED_FILES.includes(file) &&
        !EXCLUDED_FOLDERS.some((folder) => file.startsWith(folder)) &&
        // Skipping known paths is unideal, in case the file changes,
        // but hashing is far too slow to do for all files
        !knownPaths.has(file)
      );
    })
    .map((file) => ({ path: file, ext: path.extname(file).toLowerCase() }))
    .filter((file) => VALID_EXTENSIONS.includes(file.ext));

  if (validFiles.length === 0) {
    console.log("No valid files found!");
    return;
  }

	const movedFiles: { sha1: Uint8Array; oldPath: string; newPath: string }[] = [];
	const newMedias = new Map<string, MediaData>();
	const duplicates: { path1: string; path2: string }[] = [];

	const progressBar = new SingleBar({
		format: "Scanning files | {bar} | {eta_formatted} | {value}/{total} | {currentStatus} | {lastStatus}",
	});
	progressBar.start(validFiles.length, 0, { currentStatus: "Starting...", lastStatus: "" });

	const pool = new WorkerPool("./worker.ts", NUM_WORKERS);

	try {
		// Process all files in parallel
		const promises = validFiles.map((file) =>
			pool
				.processFile(file.path, file.path, file.ext)
				.then(({ sha1Str, mediaData }) => {
					progressBar.increment();

					// Check for duplicates in newly processed files
					if (newMedias.has(sha1Str)) {
						const existingPath = newMedias.get(sha1Str)!.path;
						duplicates.push({ path1: existingPath, path2: mediaData.path });
						progressBar.update({
							lastStatus: `Duplicate of "${existingPath}" at "${mediaData.path}"`,
						});
						return;
					}

					// Check for moved files
					for (const dbMedia of dbMedias) {
						if (compareHashes(dbMedia.sha1, mediaData.sha1)) {
							if (dbMedia.path !== mediaData.path) {
								movedFiles.push({
									sha1: mediaData.sha1,
									oldPath: dbMedia.path,
									newPath: mediaData.path,
								});
								progressBar.update({
									lastStatus: `Moved "${dbMedia.path}" to "${mediaData.path}"`,
								});
							} else {
								progressBar.update({
									lastStatus: `"${mediaData.path}" already known`,
								});
							}
							return;
						}
					}

					// New file
					newMedias.set(sha1Str, mediaData);
					progressBar.update({
						lastStatus: `New file "${mediaData.path}"`,
					});
				})
				.catch((err) => {
					progressBar.increment();
					progressBar.update({
						lastStatus: `Error processing "${file.path}": ${err.message}`,
					});
					console.error(`Error processing file ${file.path}:`, err);
				})
		);

		await Promise.all(promises);
	} finally {
		await pool.terminate();
	}

	progressBar.stop();
	console.log("Finished scanning files!");

  for (const moved of movedFiles) {
    console.log(`Moved file from "${moved.oldPath}" to "${moved.newPath}"`);
  }
  for (const media of newMedias.values()) {
    console.log(`Found new file "${media.path}"`);
  }
  for (const duplicate of duplicates) {
    console.log(`Found duplicate of "${duplicate.path1}" at "${duplicate.path2}"`);
  }

	// Update moved files in the database
	await prisma.$transaction(
		movedFiles.map((media) =>
			prisma.media.update({
				where: { sha1: media.sha1 },
				data: { path: media.newPath, exists: true },
			}),
		),
	);

	// Add new files to the database
	await prisma.media.createMany({ data: [...newMedias.values()] });

	// Mark missing files as such
  const missingFiles = dbMedias.filter(
    (media) =>
      media.exists &&
      !files.includes(media.path) &&
      !movedFiles.some((moved) => moved.oldPath === media.path),
  );
  for (const media of missingFiles) {
    console.log(`Missing file "${media.path}"`);
  }
	await prisma.$transaction(
    missingFiles.map((media) =>
      prisma.media.update({
        where: { sha1: media.sha1 },
        data: { exists: false },
      }),
    ),
	);
}
