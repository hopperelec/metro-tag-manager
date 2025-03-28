import {
	PUBLIC_EXCLUDED_FILES,
	PUBLIC_EXCLUDED_FOLDERS,
	PUBLIC_MEDIA_PATH,
} from "$env/static/public";
import type { AutocompleteTag } from "$lib/types";

export const MEDIAS_PATH = PUBLIC_MEDIA_PATH;
export const EXCLUDED_FOLDERS = PUBLIC_EXCLUDED_FOLDERS.split(",");
export const EXCLUDED_FILES = PUBLIC_EXCLUDED_FILES.split(",");
export const VIDEO_EXTENSIONS = [".mp4", ".mov"];
export const VALID_EXTENSIONS = [
	".jpg",
	".jpeg",
	".png",
	".webp",
	...VIDEO_EXTENSIONS,
];

export const SIZE_RANGE = { min: 0, max: 5 * 1000 ** 3 };
export const WIDTH_RANGE = { min: 0, max: 7680 };
export const HEIGHT_RANGE = { min: 0, max: 4320 };
export const DURATION_RANGE = { min: 0, max: 7200 };
export const NUMBER_TRAINS_RANGE = { min: 0, max: 10 };

export const SIZE_REGEX = new RegExp(/^(?<number>\d)+\s*((?<unit>[kmg])?b)?$/i);

export const METRO_STATION_CODES = {
	APT: "Airport",
	BDE: "Bede",
	BFT: "Bank Foot",
	BTN: "Benton",
	BYK: "Byker",
	BYW: "Brockley Whins",
	CAL: "Callerton Parkway",
	CEN: "Central Station",
	CHI: "Chichester",
	CRD: "Chillingham Road",
	CUL: "Cullercoats",
	EBO: "East Boldon",
	FAW: "Fawdon",
	FEL: "Felling",
	FGT: "Fellgate",
	FLE: "Four Lane Ends",
	GHD: "Gateshead",
	GST: "Gateshead Stadium",
	HAY: "Haymarket",
	HDR: "Hadrian Road",
	HEB: "Hebburn",
	HOW: "Howdon",
	HTH: "Heworth",
	ILF: "Ilford Road",
	JAR: "Jarrow",
	JES: "Jesmond",
	KSP: "Kingston Park",
	LBN: "Longbenton",
	MAN: "Manors",
	MLF: "Millfield",
	MSN: "Monkseaton",
	MSP: "St Peter's",
	MMT: "Monument",
	MTS: "Monument N-S",
	MTW: "Monument W-E",
	MWL: "Meadow Well",
	NPK: "Northumberland Park",
	NSH: "North Shields",
	PAL: "Pallion",
	PCM: "Percy Main",
	PLI: "Park Lane",
	PLW: "Pelaw",
	PMV: "Palmersville",
	RGC: "Regent Centre",
	SBN: "Seaburn",
	SFC: "Stadium of Light",
	SGF: "South Gosforth",
	SHL: "South Hylton",
	SJM: "St James",
	SMD: "Simonside",
	SMR: "Shiremoor",
	SSS: "South Shields",
	SUN: "Sunderland",
	TDK: "Tyne Dock",
	TYN: "Tynemouth",
	UNI: "University",
	WBR: "Wansbeck Road",
	WJS: "West Jesmond",
	WKG: "Walkergate",
	WMN: "West Monkseaton",
	WSD: "Wallsend",
	WTL: "Whitley Bay",
} as const;
export const METRO_LINES: Record<string, (keyof typeof METRO_STATION_CODES)[]> =
	{
		yellow: [
			"SJM",
			"MTW",
			"MAN",
			"BYK",
			"CRD",
			"WKG",
			"WSD",
			"HDR",
			"HOW",
			"PCM",
			"MWL",
			"NSH",
			"TYN",
			"CUL",
			"WTL",
			"MSN",
			"WMN",
			"SMR",
			"NPK",
			"PMV",
			"BTN",
			"FLE",
			"LBN",
			"SGF",
			"ILF",
			"WJS",
			"JES",
			"HAY",
			"MTS",
			"CEN",
			"GHD",
			"GST",
			"FEL",
			"HTH",
			"PLW",
			"HEB",
			"JAR",
			"BDE",
			"SMD",
			"TDK",
			"CHI",
			"SSS",
		],
		green: [
			"APT",
			"CAL",
			"BFT",
			"KSP",
			"FAW",
			"WBR",
			"RGC",
			"SGF",
			"ILF",
			"WJS",
			"JES",
			"HAY",
			"MTS",
			"CEN",
			"GHD",
			"GST",
			"FEL",
			"HTH",
			"PLW",
			"FGT",
			"BYW",
			"EBO",
			"SBN",
			"SFC",
			"MSP",
			"SUN",
			"PLI",
			"UNI",
			"MLF",
			"PAL",
			"SHL",
		],
	};

export const CONTEXT_TAGS: AutocompleteTag[] = [
	/* Type tags */
	{ name: "photo/video", emoji: "📷" },
	{ name: "screenshot", emoji: "📱" },
	{ name: "pop app screenshot", implies: ["screenshot"] },
	{ name: "thumbnail" },
	{ name: "video asset" },

	/* Focus tags */
	{ name: "train focus", emoji: "🚂" },
	{ name: "station focus", emoji: "🚉" },
	{ name: "destination board focus" },
	{ name: "advert focus" },

	/* Location tags */
	{ name: "metro station", emoji: "🚉" },
	...Object.entries(METRO_STATION_CODES).map(([code, name]) => ({
		name: code,
		displayName: `${name} metro station`,
		implies: ["metro station"],
	})),

	/* Time tags */
	{ name: "daytime", emoji: "🌅" },
	{ name: "nighttime", emoji: "🌙" },

	/* Weather tags */
	{ name: "sunny", emoji: "☀️" },
	{ name: "cloudy", emoji: "☁️" },
	{ name: "rain", emoji: "🌧️" },
	{ name: "snow", emoji: "❄️" },
	{ name: "fog", emoji: "🌫️" },

	/* Activity tags */
	{ name: "talking", emoji: "🗣️" },

	/* Angle tags */
	{ name: "normal angle" },
	{ name: "low angle" },
	{ name: "dutch angle" },
	{ name: "zoomed in" },
];

export const TRAIN_TAGS: AutocompleteTag[] = [
	/* Unit tags */
	{ name: "metro", color: "#FBB914", emoji: "🚇" },
	{ name: "class 555", implies: ["metro"] },
	...Array.from({ length: 46 }, (_, i) => ({
		name: `555${String(i + 1).padStart(3, "0")}`,
		implies: ["class 555"],
	})),
	{ name: "class 599", implies: ["metro"] },
	{ name: "female announcements 599", implies: ["class 599"] },
	...Array.from({ length: 90 }, (_, i) => {
		const unitNumber = `4${String(i + 1).padStart(3, "0")}`;
		if (i === 19)
			return {
				name: unitNumber,
				displayName: "jubilee 4020",
				implies: ["class 599"],
			};
		if (i === 72 || i === 80)
			return {
				name: unitNumber,
				displayName: `female announcements ${unitNumber}`,
				implies: ["female announcements 599"],
			};
		return { name: unitNumber, implies: ["class 599"] };
	}),
	{ name: "RHTT", emoji: "🚇" },
	{ name: "battery loco", emoji: "🚇" },
	...Array.from({ length: 3 }, (_, i) => ({
		name: `BL${i}`,
		implies: ["battery loco"],
	})),
	{ name: "national rail", color: "#7a68ae", emoji: "🚆" },
	{ name: "northern rail", implies: ["national rail"], color: "#1c2e61" },

	/* Location tags */
	{ name: "interior", implies: ["foreground"] },
	{ name: "exterior" },
	{ name: "foreground" },
	{ name: "background" },

	{ name: "cab", implies: ["interior"] },
	{ name: "middle" },
	{ name: "front" },
	{ name: "rear" },
	{ name: "from above", implies: ["exterior"] },
	{ name: "face-on", implies: ["exterior"] },
	{ name: "side-on", implies: ["exterior"] },

	{ name: "platform" },
	...Array.from({ length: 4 }, (_, i) => ({
		name: `platform ${i + 1}`,
		implies: ["platform"],
	})),
	{ name: "depot" },
	{ name: "shed", implies: ["depot"] },
	{ name: "between stations" },
	{ name: "level crossing", implies: ["between stations"] },

	/* Activity tags */
	{ name: "arriving" },
	{ name: "stopped" },
	{ name: "terminated", implies: ["stopped"] },
	{ name: "departing" },

	{ name: "not in service" },
	{
		name: "not stopping",
		implies: ["not in service", "arriving", "departing"],
	},
	{ name: "testing", implies: ["not in service"] },
	{ name: "door tests", implies: ["testing"] },
	{ name: "driver training" },

	{ name: "passenger service" },
	{ name: "yellow line service", implies: ["passenger service"], emoji: "🟡" },
	...Array.from({ length: 15 }, (_, i) => ({
		name: `T${i + 121}`,
		implies: ["yellow line service"],
	})),
	{ name: "green line service", implies: ["passenger service"], emoji: "🟢" },
	...Array.from({ length: 12 }, (_, i) => ({
		name: `T${i + 101}`,
		implies: ["green line service"],
	})),
	{ name: "additional service", implies: ["passenger service"] },
	...Array.from({ length: 59 }, (_, i) => ({
		name: `T${i + 140}`,
		implies: ["additional service"],
	})),
	...Object.entries(METRO_STATION_CODES).map(([code, name]) => ({
		name: `dest:${code}`,
		displayName: `destination ${name}`,
	})),

	/* Tones */
	{ name: "tone", emoji: "📢" },
	{ name: "low tone", implies: ["tone"] },
	{ name: "high tone", implies: ["tone"] },
	{ name: "low-high tone", implies: ["low tone", "high tone"] },

	/* Other tags */
	{ name: "doors out of use" },
];
