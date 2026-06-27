import { useMemo } from "preact/hooks";

import DOMPurify from "dompurify";
import { marked } from "marked";

// Assistant replies arrive as markdown (bold, headings, lists, links, code,
// fences, etc.). We render them properly instead of dumping raw `**…**` text.
// Pipeline: marked → HTML, then DOMPurify sanitizes (the model's output is
// untrusted), then we set it. Links are forced to open safely in a new tab.

let hookRegistered = false;

function ensureLinkHook(): void {
  if (hookRegistered || typeof window === "undefined") {
    return;
  }

  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if ((node as Element).tagName === "A") {
      (node as Element).setAttribute("target", "_blank");
      (node as Element).setAttribute("rel", "noopener noreferrer");
    }
  });

  hookRegistered = true;
}

export function Markdown({ content }: { content: string }) {
  const html = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }

    ensureLinkHook();
    const raw = marked.parse(content, { async: false, gfm: true, breaks: true });
    return DOMPurify.sanitize(raw);
  }, [content]);

  if (html === null) {
    return <p>{content}</p>;
  }

  return <div class="ai-md" dangerouslySetInnerHTML={{ __html: html }} />;
}
