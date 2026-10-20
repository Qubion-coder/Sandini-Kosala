export const INVITATION = {
  couple: {
    bride: "සඳිනී",
    groom: "කෝසල",
    brideFull: "සඳිනී",
    groomFull: "කෝසල",
  },
  parents: {
    brideFather: "සුසිල් විජේවර්ධන",
    brideMother: "රේණුකා දහනායක",
    groomFather: "රෝහණ දිසානායක",
    groomMother: "නිශා රණතුංග",
  },
  date: {
    displayNumeric: "30 . 12 . 2026",
    displayLong: "වර්ෂ 2026 ක් වූ දෙසැම්බර් මස 30 වන දින",
    countdownTarget: "2026-12-30T16:07:00+05:30",
  },
  time: {
    eventStart: "පස්වරු 6.00",
    eventEnd: "පස්වරු 10.00",
  },
  schedule: [
    { time: "ප.ව. 4.07", label: "පෝරුව චාරිත්‍රය" },
    { time: "ප.ව. 6.00", label: "අමුත්තන්ගේ පැමිණීම" },
    { time: "ප.ව. 7.30", label: "රාත්‍රී භෝජනය" },
    { time: "ප.ව. 10.15", label: "උත්සවයේ අවසානය" },
  ],
  venue: {
    name: "Seven Say",
    city: "මගලෙගොඩ, වේයන්ගොඩ",
    mapQuery: "Seven Say, Magalegoda, Veyangoda",
    googleMapsLink: "https://maps.app.goo.gl/dzkNx6C6s8q7XRVt9",
  },
  rsvpContacts: [] as string[],
} as const;

export const GUEST_PREFIXES = ["Mr.", "Mrs.", "Miss", "Mr. & Mrs.", "Family", "Dear"] as const;

// Sinhala titles follow the name, e.g. "පෙරේරා මහතා".
export const SINHALA_GUEST_SUFFIXES = [
  "මහතා",
  "මහත්මිය",
  "මෙනවිය",
  "මහතා සහ මහත්මිය",
  "ඇතුළු පවුලේ සියලු දෙනා",
] as const;

export type GuestPrefix = (typeof GUEST_PREFIXES)[number] | (typeof SINHALA_GUEST_SUFFIXES)[number];

const MAX_GUEST_NAME_LENGTH = 80;

// "Dear" is a greeting style, not part of the name: the message greeting
// already says "ආදරණීය" (Dear), so the display name is just the guest name.
export function formatDisplayName(prefix: GuestPrefix, guestName: string): string {
  const name = guestName.trim().replace(/\s+/g, " ");
  if (!name) return "";
  if ((SINHALA_GUEST_SUFFIXES as readonly string[]).includes(prefix)) return `${name} ${prefix}`;
  switch (prefix) {
    case "Family":
      return `${name} and Family`;
    case "Dear":
      return name;
    default:
      return `${prefix} ${name}`;
  }
}

// Short guest links: /i/{code}. The code is base64url of
// [title index, ...name bytes], where ASCII is one byte and each Sinhala
// letter is one byte (0x80 + offset in the Sinhala block; 0x80 = ZWJ).
// ALL_TITLES order is baked into links already sent: only append to it.
const ALL_TITLES: readonly GuestPrefix[] = [...GUEST_PREFIXES, ...SINHALA_GUEST_SUFFIXES];
const SHORT_LINK_PATH = "i";
const SINHALA_BLOCK_START = 0x0d80;
const ZWJ = 0x200d;

function encodeNameBytes(name: string): number[] | null {
  const bytes: number[] = [];
  for (const ch of name) {
    const cp = ch.codePointAt(0)!;
    if (cp < 0x80) bytes.push(cp);
    else if (cp === ZWJ) bytes.push(0x80);
    else if (cp > SINHALA_BLOCK_START && cp < SINHALA_BLOCK_START + 0x80) bytes.push(0x80 + cp - SINHALA_BLOCK_START);
    else return null;
  }
  return bytes;
}

function decodeNameBytes(bytes: number[]): string {
  return bytes
    .map((b) => (b < 0x80 ? String.fromCharCode(b) : b === 0x80 ? "\u200D" : String.fromCharCode(SINHALA_BLOCK_START + b - 0x80)))
    .join("");
}

function toBase64Url(bytes: number[]): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(code: string): number[] | null {
  if (!/^[A-Za-z0-9_-]+$/.test(code)) return null;
  try {
    return Array.from(atob(code.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

export function buildGuestLink(baseUrl: string, prefix: GuestPrefix, guestName: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  const name = guestName.trim().replace(/\s+/g, " ");
  const nameBytes = encodeNameBytes(name);
  // Names outside ASCII/Sinhala (e.g. Tamil) fall back to the readable long form.
  if (!nameBytes) return `${base}/${encodeURIComponent(formatDisplayName(prefix, name))}`;
  return `${base}/${SHORT_LINK_PATH}/${toBase64Url([ALL_TITLES.indexOf(prefix), ...nameBytes])}`;
}

function decodeShortCode(code: string): string | null {
  const bytes = fromBase64Url(code);
  if (!bytes || bytes.length < 2) return null;
  const title = ALL_TITLES[bytes[0]];
  return title ? formatDisplayName(title, decodeNameBytes(bytes.slice(1))) : null;
}

export function buildInvitationMessage(displayName: string, link: string): string {
  const { bride, groom } = INVITATION.couple;
  return [
    "💌 ✨ විවාහ ආරාධනාවයි ✨ 💌",
    "",
    `ආදරණීය ${displayName} ❤️`,
    "",
    "අපගේ ආදරණීය විවාහ දිනයේ සතුටුදායක මොහොත ඔබ සමඟ බෙදාගැනීමට අපි ආදරයෙන් ආරාධනා කරමු 💕🌸",
    "",
    "අපගේ විවාහ ආරාධනා පත්‍රය 💍✨",
    link,
    "",
    "අපගේ ආදරණීය විශේෂ දිනය තවත් ළං වී ඇත ❤️ 🌺",
    "",
    "ආදරයෙන්, 💕",
    `${bride} සහ ${groom} 💍 ✨`,
  ].join("\n");
}

// Guest name from a personalised link: /i/{code}, or the older /{name} and /?to={name}.
export function readGuestName(): string | null {
  const segment = window.location.pathname.replace(/^\/+|\/+$/g, "");
  let raw: string | null = null;
  if (segment.startsWith(`${SHORT_LINK_PATH}/`)) {
    raw = decodeShortCode(segment.slice(SHORT_LINK_PATH.length + 1));
  } else if (segment && segment.toLowerCase() !== "admin") {
    try {
      raw = decodeURIComponent(segment);
    } catch {
      // Malformed escape sequence: show the raw text rather than nothing.
      raw = segment;
    }
  } else {
    raw = new URLSearchParams(window.location.search).get("to");
  }
  if (!raw) return null;
  const name = raw.trim().replace(/\s+/g, " ").slice(0, MAX_GUEST_NAME_LENGTH);
  return name || null;
}
