import prisma from "$lib/server/prisma";

type Media = {
  id: number;
  path: string;
  contextTags: string[];
  trainTags: Record<number, string[]>;
}

export default async function getClientData() {
  const images: Media[] = [];
  const videos: Media[] = [];
  const medias = await prisma.media.findMany({
    include: {
      contextTags: { select: { tag: true } },
      trainTags: { select: { trainId: true, tag: true } }
    }
  });
  for (const media of medias) {
    const data: Media = {
      id: media.id,
      path: media.path,
      contextTags: media.contextTags.map(tag => tag.tag),
      trainTags: media.trainTags.reduce((acc, { trainId, tag }) => {
        if (!acc[trainId]) acc[trainId] = [];
        acc[trainId].push(tag);
        return acc;
      }, {} as Record<number, string[]>)
    };
    if (media.isVideo) {
      videos.push(data);
    } else {
      images.push(data);
    }
  }
  return { images, videos };
}