// Converts Unicode Sinhala to the FM keyboard layout used by legacy fonts
// such as "SINHA Nimsara 2012", which map Sinhala glyphs onto ASCII codes.

const CONSONANTS: Record<string, string> = {
  "ක": "l", "ඛ": "L", "ග": ".", "ඝ": ">", "ඞ": "X",
  "ච": "p", "ඡ": "P", "ජ": "c", "ඤ": "{", "ඥ": "F",
  "ට": "g", "ඨ": "G", "ඩ": "v", "ඪ": "V", "ණ": "K", "ඬ": "~",
  "ත": ";", "ථ": ":", "ද": "o", "ධ": "O", "න": "k", "ඳ": "|",
  "ප": "m", "ඵ": "M", "බ": "n", "භ": "N", "ම": "u", "ඹ": "U",
  "ය": "h", "ර": "r", "ල": ",", "ව": "j", "ශ": "Y", "ෂ": "I",
  "ස": "i", "හ": "y", "ළ": "<",
};

const INDEPENDENT_VOWELS: Record<string, string> = {
  "අ": "w", "ආ": "wd", "ඇ": "we", "ඈ": "wE", "ඉ": "b", "ඊ": "B",
  "උ": "W", "එ": "t", "ඔ": "T",
};

const POST_SIGNS: Record<string, string> = {
  "ා": "d", "ැ": "e", "ෑ": "E", "ි": "s", "ී": "S",
  "ු": "q", "ූ": "Q", "ෘ": "D", "්": "a", "ං": "x", "ඃ": "#",
};

// Consonants that take the alternate (detached) ු / ූ glyphs.
const ALT_U_CONSONANTS = new Set(["ක", "ග", "ත", "ශ", "භ"]);

const ZWJ = "‍";

export function toSinhaNimsara(text: string): string {
  const chars = Array.from(text);
  let out = "";
  let i = 0;

  while (i < chars.length) {
    const ch = chars[i];
    const base = CONSONANTS[ch];

    if (!base) {
      out += INDEPENDENT_VOWELS[ch] ?? POST_SIGNS[ch] ?? (ch === ZWJ ? "" : ch);
      i++;
      continue;
    }

    // Consonant cluster with optional rakaransaya / yansaya.
    let cluster = base;
    i++;
    if (chars[i] === "්" && chars[i + 1] === ZWJ && chars[i + 2] === "ර") {
      cluster += "%";
      i += 3;
    } else if (chars[i] === "්" && chars[i + 1] === ZWJ && chars[i + 2] === "ය") {
      cluster += "H";
      i += 3;
    }

    const sign = chars[i];
    switch (sign) {
      case "ෙ": out += "f" + cluster; i++; break;
      case "ේ": out += "f" + cluster + "a"; i++; break;
      case "ෛ": out += "ff" + cluster; i++; break;
      case "ො": out += "f" + cluster + "d"; i++; break;
      case "ෝ": out += "f" + cluster + "da"; i++; break;
      case "ු":
      case "ූ": {
        const long = sign === "ූ";
        if (ch === "ර" && cluster === "r") out += long ? "?" : "/";
        else if (ALT_U_CONSONANTS.has(ch)) out += cluster + (long ? "+" : "=");
        else out += cluster + (long ? "Q" : "q");
        i++;
        break;
      }
      default:
        out += cluster;
    }
  }

  return out;
}
