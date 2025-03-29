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
import ffmpeg from "fluent-ffmpeg";

type MediaData = {
	path: string;
	size: number;
	width: number | undefined;
	height: number | undefined;
	duration: number | undefined;
};

async function getCurrentFiles(relativeDir = "") {
	const files = await fs.readdir(path.join(MEDIAS_PATH, relativeDir));
	const result = [] as {
		absolutePath: string;
		relativePath: string;
		size: number;
		isVideo: boolean;
	}[];
	await Promise.allSettled(
		files.map(async (file) => {
			const relativeFilePath = path.join(relativeDir, file);
			const absoluteFilePath = path.join(MEDIAS_PATH, relativeFilePath);
			const stat = await fs.stat(absoluteFilePath);
			if (stat.isDirectory() && !EXCLUDED_FOLDERS.includes(relativeFilePath)) {
				result.push(...(await getCurrentFiles(relativeFilePath)));
			} else if (stat.isFile() && !EXCLUDED_FILES.includes(relativeFilePath)) {
				const ext = path.extname(file).toLowerCase();
				if (!VALID_EXTENSIONS.includes(ext)) return;
				result.push({
					absolutePath: absoluteFilePath,
					relativePath: relativeFilePath,
					size: stat.size,
					isVideo: VIDEO_EXTENSIONS.includes(ext),
				});
			}
		}),
	);
	return result;
}

export default async function scanAndSave() {
	const currentFiles = await getCurrentFiles();
	const res = await prisma.media.findMany({ select: { path: true } });
	const knownPaths = new Set(res.map((media) => media.path));
	const newMedias = [] as MediaData[];
	await Promise.allSettled(
		currentFiles
			.filter((file) => !knownPaths.has(file.relativePath))
			.map(async (file) => {
				newMedias.push(
					await new Promise<MediaData>((resolve, reject) => {
						ffmpeg.ffprobe(file.absolutePath, (err, metadata) => {
							if (err) reject(err);
							resolve({
								path: file.relativePath,
								size: file.size,
								width: metadata.streams[0].width,
								height: metadata.streams[0].height,
								duration: file.isVideo ? metadata.format.duration : 0,
							});
						});
					}),
				);
			}),
	);
	await prisma.media.createManyAndReturn({ data: newMedias });
}
