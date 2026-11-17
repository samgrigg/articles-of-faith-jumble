export interface Article {
  id: number;
  text: string;
  chunks: string[];
}
export interface Group {
  start: number;
  end: number;
}
export interface Tile extends Group {
  x: number;
  y: number;
  width: number;
  height: number;
}
export const letters = (text: string) =>
  text.toLowerCase().replace(/[^a-z]/g, "");
export function validate(article: Article) {
  if (
    !article.chunks.length ||
    article.chunks.some((c) => !/^[a-z]{2,}$/.test(c)) ||
    article.chunks.join("") !== letters(article.text)
  )
    throw new Error(`Invalid chunks for Article ${article.id}`);
}
export function join(a: Group, b: Group): Group | null {
  if (a.end + 1 === b.start) return { start: a.start, end: b.end };
  if (b.end + 1 === a.start) return { start: b.start, end: a.end };
  return null;
}
export function textFor(article: Article, group: Group) {
  if (group.start === group.end) return article.chunks[group.start];
  const start = article.chunks.slice(0, group.start).join("").length;
  const end = article.chunks.slice(0, group.end + 1).join("").length;
  let index = 0,
    output = "";
  for (const word of article.text.split(/\s+/).map(letters).filter(Boolean)) {
    const lo = Math.max(start - index, 0),
      hi = Math.min(end - index, word.length);
    if (hi > lo) output += (output ? " " : "") + word.slice(lo, hi);
    index += word.length;
  }
  return output;
}
export function findJoin(moving: Tile, others: Tile[], radius = 44) {
  let best: Tile | undefined,
    distance = radius;
  for (const other of others) {
    if (!join(moving, other)) continue;
    const [left, right] =
      moving.end + 1 === other.start ? [moving, other] : [other, moving];
    const d = Math.hypot(
      left.x + left.width - right.x,
      left.y + left.height / 2 - right.y - right.height / 2,
    );
    if (d <= distance) {
      best = other;
      distance = d;
    }
  }
  return best;
}
