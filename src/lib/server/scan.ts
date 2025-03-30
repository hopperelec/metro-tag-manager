import { createReadStream, promises as fs } from "node:fs";
import path from "node:path";
import {
	EXCLUDED_FILES,
	EXCLUDED_FOLDERS,
	MEDIAS_PATH,
	VALID_EXTENSIONS,
	VIDEO_EXTENSIONS,
} from "$lib/constants";
import prisma from "$lib/server/prisma";
import ffmpeg from "fluent-ffmpeg";
import { createHash } from "node:crypto";
import { SingleBar } from "cli-progress";

type MediaData = {
	path: string;
	size: number;
	sha1: Uint8Array;
	exists: true;
	width: number | undefined;
	height: number | undefined;
	duration: number | undefined;
};

const READ_BUFFER_SIZE = 1024 * 1024; // 1MB

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

function compareHashes(a: Uint8Array, b: Uint8Array) {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false;
	}
	return true;
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
	const newMedias: MediaData[] = [];
  const duplicates: { path1: string; path2: string }[] = [];

	const progressBar = new SingleBar({
    format: "Scanning files | {bar} | {eta_formatted} | {value}/{total} | {currentStatus} | {lastStatus}"
  });
  progressBar.start(validFiles.length, 0, { currentStatus: "Starting...", lastStatus: "" });

  fileIter: for (const file of validFiles) {
    progressBar.increment({ currentStatus: `Processing ${file.path}` });
    const absoluteFilePath = path.join(MEDIAS_PATH, file.path);

    const sha1 = await computeSha1(absoluteFilePath);

    for (const newMedia of newMedias) {
      if (compareHashes(newMedia.sha1, sha1)) {
        duplicates.push({ path1: newMedia.path, path2: file.path });
        progressBar.update({
          lastStatus: `Duplicate of "${newMedia.path}" at "${file.path}"`,
        })
        continue fileIter;
      }
    }

    for (const dbMedia of dbMedias) {
      if (compareHashes(dbMedia.sha1, sha1)) {
        if (dbMedia.path !== file.path) {
          movedFiles.push({ sha1, oldPath: dbMedia.path, newPath: file.path });
          progressBar.update({
            lastStatus: `Moved "${dbMedia.path}" to "${file.path}"`,
          });
        } else {
          progressBar.update({
            lastStatus: `"${file.path}" already known`,
          });
        }
        continue fileIter;
      }
    }

    const stat = await fs.stat(absoluteFilePath);
    newMedias.push(
      await new Promise<MediaData>((resolve, reject) => {
        ffmpeg.ffprobe(absoluteFilePath, (err, metadata) => {
          if (err) reject(err);
          resolve({
            path: file.path,
            size: stat.size,
            sha1,
            exists: true,
            width: metadata.streams[0].width,
            height: metadata.streams[0].height,
            duration: VIDEO_EXTENSIONS.includes(file.ext)
              ? metadata.format.duration
              : 0,
          });
        });
      }),
    );
    progressBar.update({
      lastStatus: `New file "${file.path}"`,
    });
  }
  progressBar.stop();
	console.log("Finished scanning files!");

  for (const moved of movedFiles) {
    console.log(`Moved file from "${moved.oldPath}" to "${moved.newPath}"`);
  }
  for (const media of newMedias) {
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
