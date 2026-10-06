import { Fragment, type ReactNode } from "react";

/**
 * Minimal markdown renderer for agent replies.
 *
 * The agent answers in light markdown — bullets, numbered lists, bold, inline
 * code, links. Rendering those few cases directly keeps the dependency count
 * at zero and, because everything goes through React's text nodes rather than
 * `dangerouslySetInnerHTML`, model output can never inject markup.
 */
export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.split("\n");

  let list: { ordered: boolean; items: string[] } | null = null;
  let paragraph: string[] = [];
  let table: string[][] | null = null;

  const flushTable = () => {
    if (!table || table.length === 0) return;
    const [head, ...body] = table;
    blocks.push(
      <div className="md__tablewrap" key={blocks.length}>
        <table>
          <thead>
            <tr>
              {head.map((cell, i) => (
                <th key={i}>{inline(cell)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td key={c}>{inline(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>,
    );
    table = null;
  };

  const flushList = () => {
    if (!list) return;
    const items = list.items.map((item, i) => <li key={i}>{inline(item)}</li>);
    blocks.push(
      list.ordered ? (
        <ol key={blocks.length}>{items}</ol>
      ) : (
        <ul key={blocks.length}>{items}</ul>
      ),
    );
    list = null;
  };

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push(<p key={blocks.length}>{inline(paragraph.join(" "))}</p>);
    paragraph = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      flushTable();
      continue;
    }

    // A table row: | a | b | c |. The |---|---| separator is skipped.
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      flushParagraph();
      flushList();
      const cells = trimmed.slice(1, -1).split("|").map((c) => c.trim());
      if (!cells.every((c) => /^:?-{2,}:?$/.test(c) || c === "")) {
        table ??= [];
        table.push(cells);
      }
      continue;
    }
    flushTable();

    const heading = /^(#{1,4})\s+(.*)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push(<h4 key={blocks.length}>{inline(heading[2])}</h4>);
      continue;
    }

    const bullet = /^[-*•]\s+(.*)$/.exec(trimmed);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(trimmed);

    if (bullet || numbered) {
      flushParagraph();
      const ordered = Boolean(numbered);
      const content = (bullet ?? numbered)![1];
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push(content);
      continue;
    }

    flushList();
    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();
  flushTable();

  return <div className="md">{blocks}</div>;
}

/** Handle bold, italics, inline code, and links within a line. */
function inline(text: string): ReactNode {
  const pattern =
    /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\[[^\]]+\]\([^)]+\)|\*[^*]+\*)/g;
  const parts = text.split(pattern).filter(Boolean);

  return (
    <>
      {parts.map((part, i) => {
        if (/^\*\*.+\*\*$/.test(part) || /^__.+__$/.test(part)) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        if (/^`.+`$/.test(part)) {
          return <code key={i}>{part.slice(1, -1)}</code>;
        }
        const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
        if (link) {
          const href = link[2];
          // Only allow web links; anything else renders as plain text.
          if (/^https?:\/\//i.test(href)) {
            return (
              <a key={i} href={href} target="_blank" rel="noreferrer noopener">
                {link[1]}
              </a>
            );
          }
          return <Fragment key={i}>{link[1]}</Fragment>;
        }
        if (/^\*[^*]+\*$/.test(part)) {
          return <em key={i}>{part.slice(1, -1)}</em>;
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}
