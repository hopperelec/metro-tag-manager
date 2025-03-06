import type { PageServerLoad } from "./$types";
import getClientData from "$lib/server/get-client-data";

export const load: PageServerLoad = async () => {
  return getClientData();
};