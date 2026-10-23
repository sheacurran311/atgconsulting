import type { ComponentProps } from "react";

// Preserve ordinary links, including section anchors, downloads and mailto links.
export default function Link(props: ComponentProps<"a">) {
  return <a {...props} />;
}
