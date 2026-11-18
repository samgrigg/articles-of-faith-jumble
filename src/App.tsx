import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import articles from "./articles.json";
import {
  findJoin,
  join,
  textFor,
  validate,
  type Article,
  type Group,
  type Tile,
} from "./engine";
articles.forEach(validate);
type Piece = Group & { x: number; y: number };
const storageKey = "griggware.faith-jumble.completed.v1";
function readCompleted(): number[] {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || "[]");
    return Array.isArray(value)
      ? value.filter((n) => Number.isInteger(n) && n >= 1 && n <= 13)
      : [];
  } catch {
    return [];
  }
}
export default function App() {
  const [article, setArticle] = useState<Article | null>(null);
  const [completed, setCompleted] = useState(readCompleted);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [won, setWon] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const mat = useRef<HTMLDivElement>(null),
    board = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    id: number;
    dx: number;
    dy: number;
    pointer: number;
    clientX: number;
    clientY: number;
  } | null>(null);
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  function start(a: Article) {
    const width = Math.min(window.innerWidth, 680) - 32;
    const columns = Math.max(2, Math.floor(width / 112));
    const order = a.chunks.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    setPieces(
      order.map((index, slot) => ({
        start: index,
        end: index,
        x: 12 + (slot % columns) * (width / columns) + Math.random() * 8,
        y: 24 + Math.floor(slot / columns) * 86 + Math.random() * 12,
      })),
    );
    setArticle(a);
    setWon(false);
    setActive(null);
    setAnnouncement("");
  }
  function leave() {
    setArticle(null);
    setPieces([]);
    setWon(false);
    drag.current = null;
  }
  useLayoutEffect(() => {
    if (active !== null || !board.current) return;
    const element = board.current;
    const clamp = () => {
      const width = element.clientWidth;
      setPieces((old) => {
        let changed = false;
        const next = old.map((p) => {
          const el = board.current?.querySelector<HTMLElement>(
            `[data-start="${p.start}"]`,
          );
          const x = Math.max(
            8,
            Math.min(width - (el?.offsetWidth || 90) - 8, p.x),
          );
          if (x !== p.x) {
            changed = true;
            return { ...p, x };
          }
          return p;
        });
        return changed ? next : old;
      });
    };
    clamp();
    const observer = new ResizeObserver(clamp);
    observer.observe(element);
    return () => observer.disconnect();
  }, [pieces.length, active]);
  function measured(piece: Piece): Tile {
    const el = board.current?.querySelector<HTMLElement>(
      `[data-start="${piece.start}"]`,
    );
    return {
      ...piece,
      width: el?.offsetWidth || 90,
      height: el?.offsetHeight || 54,
    };
  }
  function move(clientX: number, clientY: number) {
    const d = drag.current,
      b = board.current,
      m = mat.current;
    if (!d || !b || !m) return;
    const bounds = b.getBoundingClientRect();
    const el = b.querySelector<HTMLElement>(`[data-start="${d.id}"]`);
    const x = Math.max(
      20 - (el?.offsetWidth || 90),
      Math.min(b.clientWidth - 20, clientX - bounds.left - d.dx),
    );
    const y = Math.max(
      12,
      Math.min(
        b.clientHeight - (el?.offsetHeight || 54) - 12,
        clientY - bounds.top - d.dy,
      ),
    );
    setPieces((old) => old.map((p) => (p.start === d.id ? { ...p, x, y } : p)));
  }
  useEffect(() => {
    if (active === null) return;
    let frame = 0;
    const scroll = () => {
      const d = drag.current,
        m = mat.current;
      if (d && m) {
        const r = m.getBoundingClientRect();
        const delta =
          d.clientY > r.bottom - 70 ? 9 : d.clientY < r.top + 70 ? -9 : 0;
        if (delta) {
          m.scrollTop += delta;
          move(d.clientX, d.clientY);
        }
      }
      frame = requestAnimationFrame(scroll);
    };
    frame = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(frame);
  }, [active]);
  function finish(cancelled = false) {
    const d = drag.current;
    drag.current = null;
    setActive(null);
    if (!d || cancelled || !article) return;
    const moving = pieces.find((p) => p.start === d.id);
    if (!moving) return;
    const target = findJoin(
      measured(moving),
      pieces.filter((p) => p.start !== moving.start).map(measured),
    );
    if (!target) {
      setPieces((old) =>
        old.map((p) =>
          p.start === moving.start
            ? {
                ...p,
                x: Math.max(
                  8,
                  Math.min(
                    (board.current?.clientWidth || 350) - measured(p).width - 8,
                    p.x,
                  ),
                ),
              }
            : p,
        ),
      );
      return;
    }
    const group = join(moving, target)!;
    const next = {
      ...group,
      x: Math.min(moving.x, target.x),
      y: Math.min(moving.y, target.y),
    };
    setPieces((old) => [
      ...old.filter(
        (p) => p.start !== moving.start && p.start !== target.start,
      ),
      next,
    ]);
    setAnnouncement("You found a match!");
    if (group.start === 0 && group.end === article.chunks.length - 1) {
      setWon(true);
      setAnnouncement("Article complete!");
      setCompleted((old) => {
        const next = [...new Set([...old, article.id])];
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          /* Completion can remain in memory if storage is unavailable. */
        }
        return next;
      });
    }
  }
  const progress = article
    ? Math.round(
        ((article.chunks.length - pieces.length) /
          (article.chunks.length - 1)) *
          100,
      )
    : 0;
  return (
    <div className="app">
      {!article ? (
        <main className="index">
          <header className="brand">
            <span className="brand-mark">g.</span>
            <span>
              GRIGGWARE
              <span className="brand-sub">LITTLE GAMES. GOOD COMPANY.</span>
            </span>
          </header>
          <div className="eyebrow">A LITTLE PUZZLE. A BIG DISCOVERY.</div>
          <h1>
            Articles of Faith<span>Jumble</span>
          </h1>
          <p className="intro">
            Find a match. Build a phrase.
            <br />
            See what you can piece together!
          </p>
          <img
            className="hero-art"
            src="/puzzle-friends.jpg"
            alt=""
            width="1000"
            height="512"
          />
          <div className="collection-head">
            <h2>Choose your puzzle</h2>
            <span>{completed.length} / 13 complete</span>
          </div>
          <div className="article-list">
            {articles.map((a) => (
              <button
                key={a.id}
                className="article-card"
                onClick={() => start(a)}
                aria-label={`Article ${a.id} ${completed.includes(a.id) ? "Completed" : "Play"}`}
              >
                <span className="article-number">{a.id}</span>
                <span className="article-label">
                  Article {a.id}
                  <small>
                    {a.chunks.length} pieces{" "}
                    {completed.includes(a.id) ? "· Completed" : ""}
                  </small>
                </span>
                <span
                  className={completed.includes(a.id) ? "check" : "arrow"}
                  aria-hidden="true"
                >
                  {completed.includes(a.id) ? "✓" : "↗"}
                </span>
              </button>
            ))}
          </div>
          <footer>One piece at a time. You’ve got this!</footer>
        </main>
      ) : won ? (
        <main className="victory">
          <div className="seal" aria-hidden="true">
            ★
          </div>
          <div className="eyebrow">ARTICLE {article.id} · COMPLETE</div>
          <h1>You did it!</h1>
          <p className="victory-note">Beautifully pieced together.</p>
          <blockquote>{article.text}</blockquote>
          <button className="primary" onClick={() => start(article)}>
            Replay article
          </button>
          <button
            className="secondary"
            onClick={leave}
            aria-label="Return to articles"
          >
            Return to articles <span aria-hidden="true">↗</span>
          </button>
        </main>
      ) : (
        <div className="game">
          <header className="game-header">
            <button
              className="back"
              onClick={leave}
              aria-label="Return to articles"
            >
              ←
            </button>
            <div>
              <span className="eyebrow">ARTICLES OF FAITH</span>
              <h1>Article {article.id}</h1>
            </div>
            <span className="piece-count">
              {pieces.length}
              <small>pieces</small>
            </span>
          </header>
          <div
            className="progress"
            role="progressbar"
            aria-label="Article assembled"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div style={{ width: `${progress}%` }} />
          </div>
          <p className="mat-instruction">
            Drag matching ends together. Watch them snap!
          </p>
          <div className="mat" ref={mat}>
            <div
              className="board"
              ref={board}
              style={{
                height: Math.max(
                  620,
                  Math.ceil(
                    article.chunks.length /
                      Math.max(
                        2,
                        Math.floor(
                          (Math.min(window.innerWidth, 680) - 32) / 112,
                        ),
                      ),
                  ) *
                    86 +
                    160,
                  ...pieces.map((p) => p.y + 230),
                ),
              }}
            >
              {pieces.map((p) => (
                <button
                  key={`${p.start}-${p.end}`}
                  data-start={p.start}
                  data-end={p.end}
                  className={`tile ${active === p.start ? "dragging" : ""} ${p.end > p.start ? "joined" : ""}`}
                  style={{
                    left: p.x,
                    top: p.y,
                    zIndex: active === p.start ? 10 : 1,
                  }}
                  aria-label={`Tile: ${textFor(article, p)}`}
                  onPointerDown={(e) => {
                    if (e.button !== 0) return;
                    e.preventDefault();
                    const rect = e.currentTarget.getBoundingClientRect();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    drag.current = {
                      id: p.start,
                      dx: e.clientX - rect.left,
                      dy: e.clientY - rect.top,
                      pointer: e.pointerId,
                      clientX: e.clientX,
                      clientY: e.clientY,
                    };
                    setActive(p.start);
                  }}
                  onPointerMove={(e) => {
                    if (drag.current?.pointer !== e.pointerId) return;
                    drag.current.clientX = e.clientX;
                    drag.current.clientY = e.clientY;
                    move(e.clientX, e.clientY);
                  }}
                  onPointerUp={() => finish()}
                  onPointerCancel={() => finish(true)}
                  onKeyDown={(e) => {
                    const deltas: Record<string, [number, number]> = {
                      ArrowLeft: [-12, 0],
                      ArrowRight: [12, 0],
                      ArrowUp: [0, -12],
                      ArrowDown: [0, 12],
                    };
                    if (deltas[e.key]) {
                      e.preventDefault();
                      const [dx, dy] = deltas[e.key],
                        t = measured(p);
                      setPieces((old) =>
                        old.map((q) =>
                          q.start === p.start
                            ? {
                                ...q,
                                x: Math.max(
                                  20 - t.width,
                                  Math.min(
                                    (board.current?.clientWidth || 350) - 20,
                                    q.x + dx,
                                  ),
                                ),
                                y: Math.max(12, q.y + dy),
                              }
                            : q,
                        ),
                      );
                    }
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      drag.current = {
                        id: p.start,
                        dx: 0,
                        dy: 0,
                        pointer: -1,
                        clientX: 0,
                        clientY: 0,
                      };
                      finish();
                    }
                  }}
                >
                  <span className="magnet left" aria-hidden="true" />
                  <span>{textFor(article, p)}</span>
                  <span className="magnet right" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
          <footer className="game-footer">
            <span aria-hidden="true">✧</span> LITTLE PIECES. BIG DISCOVERIES.{" "}
            <span aria-hidden="true">✧</span>
          </footer>
        </div>
      )}
      <div className="sr-only" role="status">
        {announcement}
      </div>
      {needRefresh && (
        <div className="update">
          A new version is ready.
          <button onClick={() => updateServiceWorker(true)}>Update</button>
        </div>
      )}
    </div>
  );
}
