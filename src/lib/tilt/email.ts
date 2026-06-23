import { promises as dns } from "dns";

const COMMON_TYPOS: Record<string, string> = {
  // Gmail
  "gamil.com": "gmail.com",
  "gmial.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gmil.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gmaiil.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmaill.co": "gmail.com",
  "gnail.com": "gmail.com",
  "gmall.com": "gmail.com",
  "gmali.com": "gmail.com",
  "gmiall.com": "gmail.com",
  "gmail.net": "gmail.com",
  "gmail.cm": "gmail.com",
  "gmail.om": "gmail.com",
  "gmali.co": "gmail.com",
  "gmaail.com": "gmail.com",
  "gmmail.com": "gmail.com",
  "gmaile.com": "gmail.com",
  "gmaili.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmail.cmo": "gmail.com",
  "gmail.ocm": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.cpm": "gmail.com",
  "gnail.co": "gmail.com",
  "gnail.cmo": "gmail.com",
  "gnail.cm": "gmail.com",
  "gmaill.net": "gmail.com",
  "gmaiil.co": "gmail.com",
  "gmaail.co": "gmail.com",
  "gmmail.co": "gmail.com",
  // Yahoo
  "yaho.com": "yahoo.com",
  "yhoo.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "yhooo.com": "yahoo.com",
  "yahhoo.com": "yahoo.com",
  "yanhoo.com": "yahoo.com",
  "yahuu.com": "yahoo.com",
  "yahoo.co": "yahoo.com",
  "yahho.co": "yahoo.com",
  "yho.co": "yahoo.com",
  "yahooo.co": "yahoo.com",
  "yahu.com": "yahoo.com",
  "yajoo.com": "yahoo.com",
  "yanho.co": "yahoo.com",
  // Hotmail
  "hotmal.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotmaill.com": "hotmail.com",
  "hotmail.co": "hotmail.com",
  "hotmil.com": "hotmail.com",
  "hotamil.com": "hotmail.com",
  "hotnail.com": "hotmail.com",
  "hotmaiil.com": "hotmail.com",
  "hhotmail.com": "hotmail.com",
  "hotmial.com": "hotmail.com",
  "hotmai.co": "hotmail.com",
  "hotmaail.com": "hotmail.com",
  "hotmail.cm": "hotmail.com",
  "hotmal.co": "hotmail.com",
  "hotmaill.co": "hotmail.com",
  // Outlook
  "outlok.com": "outlook.com",
  "outloo.com": "outlook.com",
  "outlook.co": "outlook.com",
  "utlook.com": "outlook.com",
  "outllok.com": "outlook.com",
  "outlock.com": "outlook.com",
  "outlookk.com": "outlook.com",
  "outloook.com": "outlook.com",
  "outlool.com": "outlook.com",
  "outllok.co": "outlook.com",
  "ouutlook.com": "outlook.com",
  "outlok.co": "outlook.com",
  "outlokk.com": "outlook.com",
  // iCloud
  "icloud.co": "icloud.com",
  "icloudd.com": "icloud.com",
  "icould.com": "icloud.com",
  "iclod.com": "icloud.com",
  "icoud.com": "icloud.com",
  "iclooud.com": "icloud.com",
  "iccloud.com": "icloud.com",
  "iclodu.com": "icloud.com",
  "icoud.co": "icloud.com",
  "iclod.co": "icloud.com",
  // Proton
  "protonmal.com": "protonmail.com",
  "protonail.com": "protonmail.com",
  "protonmil.com": "protonmail.com",
  "protomail.com": "protonmail.com",
  "protonmai.com": "protonmail.com",
  "protonmaii.com": "protonmail.com",
  // AOL
  "aoll.com": "aol.com",
  "aol.cm": "aol.com",
  "aol.co": "aol.com",
  "ahol.com": "aol.com",
};

const TLD_TYPOS: Record<string, string> = {
  ".cmo": ".com",
  ".ocm": ".com",
  ".con": ".com",
  ".cpm": ".com",
  ".c0m": ".com",
};

const KNOWN_GOOD_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "yahoo.co.jp",
  "hotmail.com",
  "hotmail.co.uk",
  "outlook.com",
  "outlook.co.uk",
  "live.com",
  "live.co.uk",
  "icloud.com",
  "me.com",
  "mac.com",
  "protonmail.com",
  "proton.me",
  "pm.me",
  "aol.com",
  "aol.co.uk",
  "ymail.com",
  "rocketmail.com",
  "mail.com",
  "zoho.com",
  "yandex.com",
  "yandex.ru",
  "fastmail.com",
  "fastmail.fm",
  "tutanota.com",
  "tutamail.com",
  "gmx.com",
  "gmx.net",
  "gmx.de",
]);

export function correctTypoDomain(domain: string): string | null {
  const corrected = COMMON_TYPOS[domain.toLowerCase()];
  return corrected ?? null;
}

export function fixCommonTld(domain: string): string {
  const lower = domain.toLowerCase();
  for (const [typo, fixed] of Object.entries(TLD_TYPOS)) {
    if (lower.endsWith(typo)) {
      return lower.slice(0, -typo.length) + fixed;
    }
  }
  return lower;
}

export function isKnownGoodDomain(domain: string): boolean {
  return KNOWN_GOOD_DOMAINS.has(domain.toLowerCase());
}

export async function hasMxRecord(domain: string): Promise<boolean> {
  try {
    const records = await dns.resolveMx(domain);
    return records.length > 0;
  } catch {
    return false;
  }
}

export async function validateEmailDomain(
  domain: string,
): Promise<{ valid: true } | { valid: false; correctedTo: string | null }> {
  let lower = domain.toLowerCase();

  const tldFixed = fixCommonTld(lower);
  if (tldFixed !== lower) {
    return { valid: false, correctedTo: tldFixed };
  }

  const typoFix = correctTypoDomain(lower);
  if (typoFix) {
    return { valid: false, correctedTo: typoFix };
  }

  if (isKnownGoodDomain(lower)) {
    return { valid: true };
  }

  const hasMx = await hasMxRecord(lower);
  if (!hasMx) {
    return { valid: false, correctedTo: null };
  }

  return { valid: true };
}
