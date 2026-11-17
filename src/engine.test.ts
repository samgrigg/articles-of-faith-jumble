import { describe, expect, it } from "vitest";
import { join, textFor, validate, findJoin } from "./engine";
const article = {
  id: 1,
  text: "We believe in God.",
  chunks: ["webel", "ievei", "ngod"],
};
describe("magnetic puzzle rules", () => {
  it("joins consecutive groups regardless of argument order", () => {
    expect(join({ start: 1, end: 1 }, { start: 0, end: 0 })).toEqual({
      start: 0,
      end: 1,
    });
    expect(join({ start: 0, end: 1 }, { start: 2, end: 3 })).toEqual({
      start: 0,
      end: 3,
    });
  });
  it("rejects gaps and overlapping groups", () => {
    expect(join({ start: 0, end: 0 }, { start: 2, end: 2 })).toBeNull();
    expect(join({ start: 0, end: 1 }, { start: 1, end: 2 })).toBeNull();
  });
  it("restores only internal word boundaries for merged tiles", () => {
    expect(textFor(article, { start: 0, end: 0 })).toBe("webel");
    expect(textFor(article, { start: 0, end: 1 })).toBe("we believe i");
    expect(textFor(article, { start: 1, end: 2 })).toBe("ieve in god");
  });
  it("rejects invalid chunk configuration", () => {
    expect(() => validate(article)).not.toThrow();
    expect(() => validate({ ...article, chunks: ["wrong"] })).toThrow();
    expect(() =>
      validate({ ...article, chunks: ["", ...article.chunks] }),
    ).toThrow();
  });
  it("snaps only matching endpoints inside the magnetic radius", () => {
    const a = { start: 0, end: 0, x: 0, y: 0, width: 100, height: 50 };
    const b = { start: 1, end: 1, x: 130, y: 0, width: 100, height: 50 };
    expect(findJoin(a, [b], 44)).toBe(b);
    expect(findJoin(a, [{ ...b, x: 150 }], 44)).toBeUndefined();
    expect(findJoin(a, [{ ...b, start: 2, end: 2 }], 44)).toBeUndefined();
    expect(findJoin(b, [a], 44)).toBe(a);
  });
});

import articles from "./articles.json";
it("all 13 configured puzzles preserve every source letter", () => {
  expect(articles).toHaveLength(13);
  for (const article of articles) expect(() => validate(article)).not.toThrow();
});
it("removes punctuation without inventing word boundaries", () => {
  const article = {
    id: 2,
    text: "Adam’s faith—We believe.",
    chunks: ["adams", "faithwe", "believe"],
  };
  expect(textFor(article, { start: 0, end: 2 })).toBe("adams faithwe believe");
});
it("rejects tiles shorter than three letters even when source letters match", () => {
  expect(() =>
    validate({ id: 1, text: "We believe", chunks: ["webeliev", "e"] }),
  ).toThrow();
  expect(() =>
    validate({ id: 1, text: "We believe", chunks: ["we", "believe"] }),
  ).toThrow();
  expect(() =>
    validate({ id: 1, text: "We believe", chunks: ["web", "elieve"] }),
  ).not.toThrow();
});
