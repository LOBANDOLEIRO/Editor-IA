import type { DetailedHTMLProps, HTMLAttributes } from "react";

type PlayerAttributes = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
  src?: string;
  srcdoc?: string;
  width?: string;
  height?: string;
  controls?: string;
  autoplay?: string;
  loop?: string;
  muted?: string;
  "sandbox-origin"?: string;
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "hyperframes-player": PlayerAttributes;
    }
  }
}
