import prisma from "$lib/server/prisma";
import type { ServerMedia } from "$lib/types";

export default async function getClientData(): Promise<{ media: ServerMedia[] }> {
  const medias = await prisma.media.findMany({
    include: {
      contextTags: { select: { tag: true } },
      trainTags: { select: { trainId: true, tag: true } }
    }
  });
  return {
    media: medias.map((media) => {
      const trainTagsMap = new Map<number, Set<string>>();
      for (const { trainId, tag } of media.trainTags) {
        const currentTags = trainTagsMap.get(trainId);
        if (currentTags) {
          currentTags.add(tag);
        } else {
          trainTagsMap.set(trainId, new Set(tag));
        }
      }
      return {
        id: media.id,
        path: media.path,
        size: media.size === undefined ? undefined : Number(media.size), // bigint cannot be serialized to JSON
        duration: media.duration ?? undefined,
        width: media.width ?? undefined,
        height: media.height ?? undefined,
        contextTags: new Set(media.contextTags.map((tag) => tag.tag)),
        trainTags: [...trainTagsMap.values()]
      }
    })
  };
}
