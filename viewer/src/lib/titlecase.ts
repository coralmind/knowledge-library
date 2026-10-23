/**
 * Title case for headings, as on coralmind.org: short articles, conjunctions
 * and prepositions stay lowercase unless first, last or after a colon. A word
 * that already carries a capital after its first letter (AI, OCD) is left as
 * written. Entry labels are names, not headings; do not pass them through this.
 */
const MINOR = new Set('a an the and but or nor for so yet as at by in of on per to via vs'.split(' '));

export function titleCase(text: string): string {
  const words = text.split(/(\s+)/);
  let first = true;
  return words
    .map((word, i) => {
      if (!word || /^\s+$/.test(word)) return word;
      const last = i === words.length - 1;
      const afterColon = i > 1 && /:$/.test(words[i - 2] ?? '');
      const fix = (part: string) => {
        const core = part.replace(/^[^A-Za-z]+/, '');
        if (!core || /[A-Z]/.test(core.slice(1))) return part;
        const bare = core.toLowerCase().replace(/[^a-z]+$/, '');
        if (!first && !last && !afterColon && MINOR.has(bare)) return part.toLowerCase();
        return part.replace(core.charAt(0), core.charAt(0).toUpperCase());
      };
      const out = word.split('-').map(fix).join('-');
      first = false;
      return out;
    })
    .join('');
}
