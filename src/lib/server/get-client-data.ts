import prisma from "$lib/server/prisma";

type Media = {
  id: number;
  path: string;
  size?: number;
  duration?: number;
  width?: number;
  height?: number;
  contextTags: string[];
  trainTags: Record<number, string[]>;
}

export default async function getClientData(): Promise<{ media: Media[] }> {
  const medias = await prisma.media.findMany({
    include: {
      contextTags: { select: { tag: true } },
      trainTags: { select: { trainId: true, tag: true } }
    }
  });
  return {
    media: medias.map(media => (
      {
        id: media.id,
        path: media.path,
        size: media.size ?? undefined,
        duration: media.duration ?? undefined,
        width: media.width ?? undefined,
        height: media.height ?? undefined,
        contextTags: media.contextTags.map(tag => tag.tag),
        trainTags: media.trainTags.reduce((acc, { trainId, tag }) => {
          if (!acc[trainId]) acc[trainId] = [];
          acc[trainId].push(tag);
          return acc;
        }, {} as Record<number, string[]>)
      }
    ))
  }
}