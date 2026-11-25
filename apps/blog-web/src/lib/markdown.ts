import rehypeHighlight from "rehype-highlight";
import rehypeSanitize, {
  defaultSchema,
  type Options as SanitizeOptions,
} from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

const markdownSanitizeSchema: SanitizeOptions = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [
      ...(defaultSchema.attributes?.code ?? []),
      ["className", /^language-/, /^hljs/],
    ],
    span: [
      ...(defaultSchema.attributes?.span ?? []),
      ["className", /^hljs-/],
    ],
    pre: [
      ...(defaultSchema.attributes?.pre ?? []),
      ["className", /^hljs/],
    ],
  },
};

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeHighlight, { detect: true, ignoreMissing: true })
  .use(rehypeSanitize, markdownSanitizeSchema)
  .use(rehypeStringify);

export async function renderMarkdownToHtml(markdown: string): Promise<string> {
  const file = await processor.process(markdown || "");
  return String(file);
}
