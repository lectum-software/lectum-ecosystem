import type { PropsWithChildren } from "react";

import * as styles from "./styles";

export const CenterTemplate = ({ children }: PropsWithChildren) => {
  return (
    <main className={styles.container}>
      <div className={styles.contentWrapper}>{children}</div>
    </main>
  );
};
