import type { ReactNode } from "react";

export default function CommunitySlugLayout({
  children,
  modal,
}: Readonly<{
  children: ReactNode;
  modal: ReactNode;
}>) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
