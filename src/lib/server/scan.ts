import { promises as fs } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
	EXCLUDED_FILES,
	EXCLUDED_FOLDERS,
	MEDIAS_PATH,
	VALID_EXTENSIONS,
} from "$lib/constants";
import prisma from "$lib/server/prisma";
import xxhash from "xxhash-wasm";
import { SingleBar } from "cli-progress";

const execFileAsync = promisify(execFile);

type Hash = Uint8Array<ArrayBuffer>;

interface MediaData {
	path: string;
	size: number;
	hash: Hash;
	exists: true;
	width?: number;
	height?: number;
	duration?: number;
}

// How many bytes at the start and end of each file to use for the hash
const HASH_START_SIZE = 1024 * 1024; // 1MB
const HASH_END_SIZE = 1024 * 1024; // 1MB

// A unique ID for a file based on its size and hash
type FileId = string;
function getFileId(size: number | bigint, hash: Hash): FileId {
  return `${size}-${Buffer.from(hash).toString("hex")}`;
}

async function createHasher(): Promise<(filePath: string, size: number) => Promise<Hash>> {
  const { h64Raw } = await xxhash();
  const sharedBuffer = Buffer.allocUnsafe(HASH_START_SIZE + HASH_END_SIZE);

  return async (filePath: string, size: number) => {
    // Get the first and last parts of the file to compute the hash
    let buffer: Buffer;
    if (size <= HASH_START_SIZE + HASH_END_SIZE) {
      buffer = await fs.readFile(filePath);
    } else {
      buffer = sharedBuffer
      const fd = await fs.open(filePath, "r");
      try {
        await fd.read(buffer, 0, HASH_START_SIZE, 0);
        await fd.read(buffer, HASH_START_SIZE, HASH_END_SIZE, size - HASH_END_SIZE);
      } finally {
        await fd.close();
      }
    }

    const hashBigInt = h64Raw(new Uint8Array(buffer));
    // Convert the bigint hash to a Uint8Array
    const hashArray = new Uint8Array(8);
    const view = new DataView(hashArray.buffer);
    view.setBigUint64(0, hashBigInt, false);

    return hashArray;
  }
}

async function getMediaMetadata(filePath: string): Promise<{
  width?: number;
  height?: number;
  duration?: number;
}> {
  try {
    const {stdout} = await execFileAsync("ffprobe", [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=width,height:format=duration",
      "-of", "json",
      "--",
      filePath,
    ]);
    const ffProbeResult = JSON.parse(stdout);

    const result: {
      width?: number;
      height?: number;
      duration?: number;
    } = {};
    if (ffProbeResult.streams?.[0]) {
      result.width = ffProbeResult.streams[0].width;
      result.height = ffProbeResult.streams[0].height;
    }
    if (ffProbeResult.format?.duration) {
      const parsed = parseFloat(ffProbeResult.format.duration);
      if (!isNaN(parsed)) {
        result.duration = parsed;
      }
    }
    return result;
  } catch (error) {
    return {};
  }
}

export default async function scanAndSave() {
  console.log("Preparing to scan files...");

  const computeHash = await createHasher();

	const dbMediasArray: {
    path: string;
    size: bigint;
    hash: Hash;
    exists: boolean;
  }[] = await prisma.media.findMany({
		select: {
      path: true,
      size: true,
      hash: true,
      exists: true
    },
	});
  const dbPaths = new Set(dbMediasArray.map(media => media.path));

  const files = await fs.readdir(MEDIAS_PATH, { recursive: true });
  const validFiles = files
    .filter((file) => {
      return (
        !EXCLUDED_FILES.includes(file) &&
        !EXCLUDED_FOLDERS.some(folder => file.startsWith(folder + path.sep)) &&
        !dbPaths.has(file)
      );
    })
    .map((file) => ({ path: file, ext: path.extname(file).toLowerCase() }))
    .filter((file) => VALID_EXTENSIONS.includes(file.ext));

  if (validFiles.length === 0) {
    console.log("No valid files found!");
    return;
  }

  const dbMedias: Record<FileId, typeof dbMediasArray[number]> = {};
  for (const media of dbMediasArray) {
    dbMedias[getFileId(media.size, media.hash)] = media;
  }

	const movedFiles: Record<FileId, {
    size: bigint;
    hash: Hash;
    oldPath: string;
    newPath: string
  }> = {};
	const newFiles: Record<FileId, MediaData> = {};
  const duplicates: { path1: string; path2: string }[] = [];

	const progressBar = new SingleBar({
    format: "Scanning files | {bar} | {eta_formatted} | {value}/{total} | {currentStatus} | {lastStatus}"
  });
  progressBar.start(validFiles.length, 0, { currentStatus: "Starting...", lastStatus: "" });

  for (const file of validFiles) {
    progressBar.increment({ currentStatus: `Processing ${file.path}` });
    const absoluteFilePath = path.join(MEDIAS_PATH, file.path);

    const { size: fileSize } = await fs.stat(absoluteFilePath);
    const hash = await computeHash(absoluteFilePath, fileSize);
    const fileId = getFileId(fileSize, hash);

    const existingMedia = newFiles[fileId];
    if (existingMedia) {
      duplicates.push({ path1: existingMedia.path, path2: file.path });
      progressBar.update({
        lastStatus: `Duplicate of "${existingMedia.path}" at "${file.path}"`,
      });
      continue;
    }

    const dbMedia = dbMedias[fileId];
    if (dbMedia) {
      movedFiles[fileId] = {
        size: dbMedia.size,
        hash: dbMedia.hash,
        oldPath: dbMedia.path,
        newPath: file.path
      };
      progressBar.update({
        lastStatus: `Moved "${dbMedia.path}" to "${file.path}"`,
      });
      continue;
    }

    newFiles[fileId] = {
      path: file.path,
      size: fileSize,
      hash,
      exists: true,
      ...await getMediaMetadata(absoluteFilePath),
    };

    progressBar.update({
      lastStatus: `New file "${file.path}"`,
    });
  }
  progressBar.stop();
	console.log("Finished scanning files!");

  for (const moved of Object.values(movedFiles)) {
    console.log(`Moved file from "${moved.oldPath}" to "${moved.newPath}"`);
  }
  for (const media of Object.values(newFiles)) {
    console.log(`Found new file "${media.path}"`);
  }
  for (const duplicate of duplicates) {
    console.log(`Found duplicate of "${duplicate.path1}" at "${duplicate.path2}"`);
  }

	// Update moved files in the database
	await prisma.$transaction(
    Object.values(movedFiles).map((media) =>
			prisma.media.update({
				where: {
          size_hash: { size: media.size, hash: media.hash },
        },
				data: { path: media.newPath, exists: true },
			}),
		),
	);

	// Add new files to the database
	await prisma.media.createMany({ data: Object.values(newFiles) });

	// Mark missing files as such
  const missingFiles = Object.entries(dbMedias)
    .filter(([fileId, media]) =>
      media.exists && !files.includes(media.path) && !movedFiles[fileId]
  ).map(([_, media]) => media);
  for (const media of missingFiles) {
    console.log(`Missing file "${media.path}"`);
  }
	await prisma.$transaction(
    missingFiles.map((media) =>
      prisma.media.update({
        where: {
          size_hash: { size: media.size, hash: media.hash },
        },
        data: { exists: false },
      }),
    ),
	);
}
