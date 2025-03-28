import prisma from "$lib/server/prisma";
import { type RequestHandler, error } from "@sveltejs/kit";

function validateTag(tag: unknown): boolean {
	return typeof tag === "string" && tag.length > 0 && tag.length <= 50;
}

function validateTrain(train: unknown): boolean {
	return Array.isArray(train) && train.length <= 10 && train.every(validateTag);
}

function validatedBody(body: unknown) {
	if (!Array.isArray(body)) return null;
	if (
		!body.every((bodyItem: unknown) => {
			if (typeof bodyItem !== "object" || bodyItem === null) return false;
			const bodyObj = bodyItem as Record<string, unknown>;
			return (
				typeof bodyObj.id === "number" &&
				Array.isArray(bodyObj.contextTags) &&
				bodyObj.contextTags.every(validateTag) &&
				Array.isArray(bodyObj.trainTags) &&
				bodyObj.trainTags.every(validateTrain)
			);
		})
	)
		return null;
	return body as {
		id: number;
		contextTags: string[];
		trainTags: string[][];
	}[];
}

export const POST: RequestHandler = async ({ request }) => {
	const body = validatedBody(await request.json());
	if (body === null) return error(400, "Invalid body");
	await prisma.$transaction(
		body.map(({ id: mediaId, contextTags, trainTags }) =>
			prisma.media.update({
				where: { id: mediaId },
				data: {
					contextTags: {
						connectOrCreate: contextTags.map((tag) => ({
							where: { mediaId_tag: { mediaId, tag } },
							create: { tag },
						})),
					},
					trainTags: {
						deleteMany: { mediaId },
						create: trainTags.flatMap((train, trainId) =>
							train.map((tag) => ({ trainId, tag })),
						),
					},
				},
			}),
		),
	);
	return new Response(null, { status: 204 });
};
