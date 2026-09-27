import type { ReactNode } from "react";

export const MentorAuthorMeta = ({
  badge,
  typeLabel,
  date,
  children,
}: {
  badge?: string | null;
  typeLabel?: string | null;
  date: ReactNode;
  children: ReactNode;
}) => {
  const rank = badge?.match(/#([123])\b/)?.[1];
  if (!rank) return <>{children}</>;

  return (
    <span className="block min-w-0 whitespace-normal">
      <span className="block leading-snug">
        {typeLabel ? <>{typeLabel} &bull; </> : null}
        Top {rank} mentor nesta comunidade
      </span>
      <span className="mt-0.5 block text-[10px] font-normal leading-snug">{date}</span>
    </span>
  );
};
