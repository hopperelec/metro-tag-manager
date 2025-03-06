import { promises as fs } from "node:fs";
import path from "node:path";
import prisma from "$lib/server/prisma";
import { EXCLUDED_FILES, EXCLUDED_FOLDERS, MEDIA_PATH, VALID_EXTENSIONS, VIDEO_EXTENSIONS } from "$lib/constants";
import ffmpeg from "fluent-ffmpeg";

type FileData = {
  path: string;
  size: number;
  width: number | undefined;
  height: number | undefined;
  duration: number | undefined;
}

async function scan(relativeDir = ""): Promise<FileData[]> {
  const files = await fs.readdir(path.join(MEDIA_PATH, relativeDir));
  const media: FileData[] = [];
  for (const file of files) {
    const relativeFilePath = path.join(relativeDir, file);
    const absoluteFilePath = path.join(MEDIA_PATH, relativeFilePath);
    const stat = await fs.stat(absoluteFilePath);

    if (stat.isDirectory() && !EXCLUDED_FOLDERS.includes(relativeFilePath)) {
      media.push(...await scan(relativeFilePath));
    } else if (stat.isFile() && !EXCLUDED_FILES.includes(relativeFilePath)) {
      const ext = path.extname(file).toLowerCase();
      if (!VALID_EXTENSIONS.includes(ext)) continue;
      const isVideo = VIDEO_EXTENSIONS.includes(ext);
      const fileData = await new Promise<FileData>((resolve, reject) => {
        ffmpeg.ffprobe(absoluteFilePath, (err, metadata) => {
          if (err) reject(err);
          resolve({
            path: relativeFilePath,
            size: stat.size,
            width: metadata.streams[0].width,
            height: metadata.streams[0].height,
            duration: isVideo ? metadata.format.duration : 0
          });
        });
      });
      media.push(fileData);
    }
  }
  return media;
}

export default async function scanAndSave() {
  const newMedia = await scan();
  const res = await prisma.media.findMany({ select: { path: true } });
  const knownPaths = new Set(res.map((media) => media.path));
  await prisma.media.createManyAndReturn({
    data: newMedia.filter((file) => !knownPaths.has(file.path))
  });
}