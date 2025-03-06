import { json, type RequestHandler } from "@sveltejs/kit";
import scanAndSave from "$lib/server/scan";
import getClientData from "$lib/server/get-client-data";

export const GET: RequestHandler = async () => {
  await scanAndSave();
  return json(getClientData());
};