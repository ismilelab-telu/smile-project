declare module "*.mdx" {
  import type { ComponentType } from "react";

  const MDXComponent: ComponentType<{
    components?: Record<string, ComponentType<Record<string, unknown>>>;
  }>;
  export default MDXComponent;
}

declare module "*.mdx?raw" {
  const content: string;
  export default content;
}

declare module "virtual:learning-mdx-raw" {
  const lessonMdxRawByPath: Record<string, string>;
  export default lessonMdxRawByPath;
}
