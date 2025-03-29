import prisma from "$lib/server/prisma";
import type { ServerMedia } from "$lib/types";

export default async function getClientData(): Promise<{
	medias: ServerMedia[];
}> {
	const medias = await prisma.media.findMany({
		include: {
			contextTags: { select: { tag: true } },
			trainTags: { select: { trainId: true, tag: true } },
		},
	});
	return {
		medias: medias.map((media) => {
			const trainTagsMap = new Map<number, string[]>();
			for (const { trainId, tag } of media.trainTags) {
				const currentTags = trainTagsMap.get(trainId);
				if (currentTags) {
					currentTags.push(tag);
				} else {
					trainTagsMap.set(trainId, [tag]);
				}
			}
			return {
				id: media.id,
				path: media.path,
				size: media.size === undefined ? undefined : Number(media.size), // bigint cannot be serialized to JSON
				duration: media.duration ?? undefined,
				width: media.width ?? undefined,
				height: media.height ?? undefined,
				contextTags: media.contextTags.map((tag) => tag.tag),
				trainTags: [...trainTagsMap.values()],
			};
		}),
	};
}
