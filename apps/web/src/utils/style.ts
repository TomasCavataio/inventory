import type { CSSProperties } from "react";

export function delayStyle(delay: string): CSSProperties {
  return { "--delay": delay } as CSSProperties;
}
