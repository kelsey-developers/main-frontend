/** Parse [unit:123] tags from AI message and extract unit IDs */
export function parseUnitIdsFromMessage(message: string): string[] {
  const matches = message.matchAll(/\[unit:(\d+)\]/gi);
  const ids = [...matches].map((m) => m[1]);
  return [...new Set(ids)];
}

/** Get display text with [unit:id] tags stripped */
export function stripUnitTags(message: string): string {
  return message.replace(/\[unit:\d+\]/gi, '').replace(/\s{2,}/g, ' ').trim();
}
