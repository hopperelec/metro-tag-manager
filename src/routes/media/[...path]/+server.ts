import { error, type RequestHandler } from "@sveltejs/kit";
import { EXCLUDED_FILES, EXCLUDED_FOLDERS, MEDIA_FOLDER, VALID_EXTENSIONS } from "$lib/server/scan";
import path from "node:path";
import { createReadStream, promises as fs } from "node:fs";
import mime from "mime";

function createReadableStream(filePath: string, start?: number, end?: number) {
  const stream = createReadStream(filePath, { start, end });
  return new ReadableStream({
    start(controller) {
      stream.on("data", (chunk) => controller.enqueue(chunk));
      stream.on("end", () => controller.close());
      stream.on("error", (err) => controller.error(err));
    },
    cancel() {
      stream.destroy();
    }
  });
}

export const GET: RequestHandler = async ({ params, request }) => {
  const relativePath = params.path as string;
  if (relativePath.includes(".."))
    error(403, "Forbidden");
  if (EXCLUDED_FOLDERS.some((folder) => relativePath.startsWith(folder)))
    error(403, "Forbidden");
  const filename = path.basename(relativePath);
  if (EXCLUDED_FILES.includes(filename))
    error(403, "Forbidden");
  const ext = path.extname(filename).toLowerCase();
  if (!VALID_EXTENSIONS.includes(ext))
    error(403, "Forbidden");

  const filePath = path.join(MEDIA_FOLDER, relativePath);
  try {
    await fs.access(filePath, fs.constants.R_OK);
  } catch {
    error(404, "Not found");
  }

  const stat = await fs.stat(filePath);
  if (!stat.isFile())
    error(403, "Forbidden");
  const fileSize = stat.size;

  const contentType = mime.getType(ext) || "application/octet-stream";
  if (contentType.startsWith("video/")) {
    const range = request.headers.get("range");
    if (range) {
      const match = range.match(/^bytes=(\d+)-(\d+)?$/);
      if (!match) error(400, "Invalid Range header");

      const start = +match[1];
      let end = match[2] ? +match[2] : fileSize - 1;
      if (start >= fileSize || end >= fileSize) error(416, "Range Not Satisfiable");

      // Partial video
      return new Response(createReadableStream(filePath, start, end), {
        status: 206,
        headers: {
          "Content-Type": contentType,
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": (end - start + 1).toString()
        }
      });
    }

    // Full video
    return new Response(createReadableStream(filePath), {
      headers: {
        "Content-Type": contentType,
        "Content-Length": fileSize.toString(),
        "Accept-Ranges": "bytes"
      }
    });
  }

  // Image
  return new Response(createReadableStream(filePath), {
    headers: {
      "Content-Type": contentType,
      "Content-Length": fileSize.toString()
    }
  });
};