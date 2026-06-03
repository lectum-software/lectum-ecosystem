import type { PropsWithChildren } from "react";

export const PublicTemplate = ({ children }: PropsWithChildren) => {
  return <div className="min-h-screen bg-background text-foreground">{children}</div>;
};
