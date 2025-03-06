import getClientData from "$lib/server/get-client-data";
import scanAndSave from "$lib/server/scan";
import { type RequestHandler, json } from "@sveltejs/kit";

export const GET: RequestHandler = async () => {
	await scanAndSave();
	return json(await getClientData());
};
