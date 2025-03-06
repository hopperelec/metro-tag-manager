import { PUBLIC_EXCLUDED_FILES, PUBLIC_EXCLUDED_FOLDERS, PUBLIC_MEDIA_PATH } from "$env/static/public";

export const MEDIA_PATH = PUBLIC_MEDIA_PATH;
export const EXCLUDED_FOLDERS = PUBLIC_EXCLUDED_FOLDERS.split(",");
export const EXCLUDED_FILES = PUBLIC_EXCLUDED_FILES.split(",");
export const VIDEO_EXTENSIONS = [".mp4", ".mov"];
export const VALID_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ...VIDEO_EXTENSIONS];