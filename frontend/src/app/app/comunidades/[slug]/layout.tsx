import type { ReactNode } from "react";

export default function ComunidadesSlugLayout({
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
