export const profileSectionTabStyles = {
  list: "flex w-full items-center justify-center border-b border-border",
  button:
    "relative inline-flex h-[44px] min-w-0 flex-1 cursor-pointer items-center justify-center gap-[3px] bg-transparent px-0 before:pointer-events-none before:absolute before:inset-x-3 before:bottom-0 before:h-[2px] before:rounded-full before:content-[''] transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-65",
  active: "text-foreground before:bg-foreground",
  inactive: "text-muted hover:text-foreground",
  label: "min-w-0 truncate text-[13px] font-semibold leading-5 max-[359px]:text-[12px]",
  count:
    "h-[18px] min-w-[18px] max-w-[40%] shrink-0 truncate rounded-[5px] bg-surface-muted px-1 text-center text-[11px] font-semibold leading-[18px] tabular-nums text-muted",
};
