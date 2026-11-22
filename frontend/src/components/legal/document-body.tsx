import { Fragment, type ReactNode } from "react";

// Only headings and paragraphs are interpreted. HTML, links and all inline Markdown stay text.
export const parseLegalText = (body: string) => {
  const blocks: { key: number; text: string; heading: number | null }[] = [];
  let paragraph: string[] = [];
  let start = 0;
  const flush = () => {
    if (paragraph.length) blocks.push({ key: start, text: paragraph.join("\n"), heading: null });
    paragraph = [];
  };
  for (const [index, line] of body.replace(/\r\n?/g, "\n").split("\n").entries()) {
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      flush();
      blocks.push({ key: index, text: heading[2], heading: Math.min(6, heading[1].length + 1) });
    } else if (!line.trim()) {
      flush();
    } else {
      if (!paragraph.length) start = index;
      paragraph.push(line);
    }
  }
  flush();
  return blocks;
};

export const LegalDocumentBody = ({
  body,
  cookiesPreferences,
}: {
  body: string;
  cookiesPreferences?: ReactNode;
}) => {
  const blocks = parseLegalText(body);
  const section = blocks.findIndex(
    (block) => block.heading && /^4[.)]\s+Cookies\b/i.test(block.text),
  );
  const nextSection =
    section < 0
      ? -1
      : blocks.findIndex(
          (block, index) =>
            index > section &&
            block.heading !== null &&
            block.heading <= (blocks[section].heading ?? 6),
        );
  const insertAfter = section < 0 ? -1 : (nextSection < 0 ? blocks.length : nextSection) - 1;
  return (
    <div className="grid min-w-0 gap-4 break-words [overflow-wrap:anywhere]">
      {blocks.map((block, index) => {
        const preferences = index === insertAfter ? cookiesPreferences : null;
        if (block.heading) {
          const Heading = `h${block.heading}` as "h2" | "h3" | "h4" | "h5" | "h6";
          return (
            <Fragment key={block.key}>
              <Heading className="mt-3 text-lg font-bold leading-7 text-foreground" key={block.key}>
                {block.text}
              </Heading>
              {preferences}
            </Fragment>
          );
        }
        return (
          <Fragment key={block.key}>
            <p
              className="whitespace-pre-wrap text-sm leading-7 text-foreground sm:text-base"
              key={block.key}
            >
              {block.text}
            </p>
            {preferences}
          </Fragment>
        );
      })}
    </div>
  );
};
