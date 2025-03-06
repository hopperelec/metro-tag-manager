import { PUBLIC_EXCLUDED_FILES, PUBLIC_EXCLUDED_FOLDERS, PUBLIC_MEDIA_PATH } from "$env/static/public";

export const MEDIA_PATH = PUBLIC_MEDIA_PATH;
export const EXCLUDED_FOLDERS = PUBLIC_EXCLUDED_FOLDERS.split(",");
export const EXCLUDED_FILES = PUBLIC_EXCLUDED_FILES.split(",");
export const VIDEO_EXTENSIONS = [".mp4", ".mov"];
export const VALID_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ...VIDEO_EXTENSIONS];

export const SIZE_RANGE = { min: 0, max: 5 * (1000 ** 3) };
export const WIDTH_RANGE = { min: 0, max: 7680 };
export const HEIGHT_RANGE = { min: 0, max: 4320 };
export const DURATION_RANGE = { min: 0, max: 7200 };
export const NUMBER_TRAINS_RANGE = { min: 0, max: 10 };