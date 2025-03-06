import { promises as fs } from "node:fs";
import path from "node:path";
import prisma from "$lib/server/prisma";

export const MEDIA_FOLDER = "D:\\hoppe\\Videos\\Metros";
export const EXCLUDED_FOLDERS = ["announcements"];
export const EXCLUDED_FILES = ["555 diagram.png"];
export const VIDEO_EXTENSIONS = [".mp4", ".mov"];
export const VALID_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ...VIDEO_EXTENSIONS];

async function scan(relativeDir = ""): Promise<{ images: string[]; videos: string[] }> {
  const files = await fs.readdir(path.join(MEDIA_FOLDER, relativeDir));
  const images = [];
  const videos = [];
  for (const file of files) {
    const relativeFilePath = path.join(relativeDir, file);
    const absoluteFilePath = path.join(MEDIA_FOLDER, relativeFilePath);
    const stat = await fs.stat(absoluteFilePath);

    if (stat.isDirectory() && !EXCLUDED_FOLDERS.includes(relativeFilePath)) {
      const children = await scan(relativeFilePath);
      images.push(...children.images);
      videos.push(...children.videos);
    } else if (stat.isFile() && !EXCLUDED_FILES.includes(relativeFilePath)) {
      const ext = path.extname(file).toLowerCase();
      if (!VALID_EXTENSIONS.includes(ext)) continue;
      if (VIDEO_EXTENSIONS.includes(ext)) {
        videos.push(relativeFilePath);
      } else {
        images.push(relativeFilePath);
      }
    }
  }
  return { images, videos };
}

export default async function scanAndSave() {
  const newMedia = await scan();
  const res = await prisma.media.findMany({ select: { path: true } });
  const knownPaths = new Set(res.map((media) => media.path));
  await prisma.media.createManyAndReturn({
    data: [
      ...newMedia.images
        .filter((path) => !knownPaths.has(path))
        .map((path) => ({ path, isVideo: false })),
      ...newMedia.videos
        .filter((path) => !knownPaths.has(path))
        .map((path) => ({ path, isVideo: true }))
    ]
  });
}