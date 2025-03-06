import getClientData from "$lib/server/get-client-data";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
	return getClientData();
};
