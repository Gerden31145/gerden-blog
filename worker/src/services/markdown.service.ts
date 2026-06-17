import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import rehypeShikiFromHighlighter from '@shikijs/rehype/core'
import { createHighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import langBash from '@shikijs/langs/bash'
import langCpp from '@shikijs/langs/cpp'
import langCss from '@shikijs/langs/css'
import langHtml from '@shikijs/langs/html'
import langJava from '@shikijs/langs/java'
import langJavaScript from '@shikijs/langs/javascript'
import langJson from '@shikijs/langs/json'
import langSql from '@shikijs/langs/sql'
import langTypeScript from '@shikijs/langs/typescript'
import langVue from '@shikijs/langs/vue'
import type { Heading, PhrasingContent, Root } from 'mdast'
import type { HighlighterCore, ThemeRegistrationRaw } from '@shikijs/types'
import type { VFile } from 'vfile'
import type { TocItem } from '../types/post'

declare module 'vfile' {
  interface DataMap {
    toc: TocItem[]
  }
}

const theme = {
  name: 'gerden-light',
  fg: '#1f2937',
  bg: '#ccdff7',
  settings: [
    {
      settings: {
        foreground: '#1f2937',
        background: '#ccdff7',
      },
    },
    {
      scope: ['comment', 'punctuation.definition.comment'],
      settings: {
        foreground: '#5f6f89',
        fontStyle: 'italic',
      },
    },
    {
      scope: ['keyword', 'storage', 'storage.type', 'storage.modifier'],
      settings: {
        foreground: '#da0d76',
      },
    },
    {
      scope: ['string', 'punctuation.definition.string'],
      settings: {
        foreground: '#16a1a0',
      },
    },
    {
      scope: ['constant.numeric', 'constant.language', 'support.constant'],
      settings: {
        foreground: '#7c4cc1',
      },
    },
    {
      scope: ['entity.name.function', 'support.function', 'meta.function-call'],
      settings: {
        foreground: '#4078f2',
      },
    },
    {
      scope: ['variable', 'identifier'],
      settings: {
        foreground: '#335b94',
      },
    },
    {
      scope: ['variable.parameter'],
      settings: {
        foreground: '#e06c75',
      },
    },
    {
      scope: ['entity.name.type', 'support.type', 'support.class'],
      settings: {
        foreground: '#ef5a00',
      },
    },
    {
      scope: ['entity.name.tag', 'support.class.component'],
      settings: {
        foreground: '#e06c75',
      },
    },
    {
      scope: ['entity.other.attribute-name'],
      settings: {
        foreground: '#d19a66',
      },
    },
    {
      scope: ['punctuation', 'meta.brace', 'meta.delimiter'],
      settings: {
        foreground: '#4b5563',
      },
    },
    {
      scope: ['invalid', 'invalid.illegal'],
      settings: {
        foreground: '#ffffff',
        background: '#e06c75',
      },
    },
  ],
} satisfies ThemeRegistrationRaw

const sanitizeSchema = {
  ...defaultSchema,
  clobberPrefix: '',
  attributes: {
    ...(defaultSchema.attributes ?? {}),
    '*': [...(defaultSchema.attributes?.['*'] ?? []), 'id'],
  },
}

let highlighterPromise: Promise<HighlighterCore> | null = null

function getHighlighter() {
  highlighterPromise ??= createHighlighterCore({
    themes: [theme],
    langs: [
      langBash,
      langCpp,
      langCss,
      langHtml,
      langJava,
      langJavaScript,
      langJson,
      langSql,
      langTypeScript,
      langVue,
    ],
    engine: createJavaScriptRegexEngine(),
  })

  return highlighterPromise
}

function extractText(node: PhrasingContent): string {
  if (node.type === 'text' || node.type === 'inlineCode') return node.value
  if ('children' in node) return node.children.map(extractText).join('')

  return ''
}

function headingId(text: string) {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '') || 'section'
}

function applyHeadingId(node: Heading, id: string) {
  node.data ??= {}
  node.data.hProperties = {
    ...(node.data.hProperties ?? {}),
    id,
  }
}

function remarkExtractToc() {
  return (tree: Root, file: VFile) => {
    const toc: TocItem[] = []
    const slugCount = new Map<string, number>()

    for (const node of tree.children) {
      if (node.type !== 'heading') continue

      const text = node.children.map(extractText).join('')
      const baseId = headingId(text)
      const count = (slugCount.get(baseId) ?? 0) + 1
      const id = count > 1 ? `${baseId}-${count}` : baseId

      slugCount.set(baseId, count)
      applyHeadingId(node, id)
      toc.push({ id, text, depth: node.depth })
    }

    file.data.toc = toc
  }
}

export type MarkdownRenderResult = {
  html: string
  toc: TocItem[]
}

export async function markdownToHTML(markdown: string): Promise<MarkdownRenderResult> {
  const highlighter = await getHighlighter()

  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkExtractToc)
    .use(remarkRehype)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeShikiFromHighlighter, highlighter, {
      theme: 'gerden-light',
      defaultLanguage: 'text',
      fallbackLanguage: 'text',
      addLanguageClass: true,
    })
    .use(rehypeStringify)
    .process(markdown)

  return {
    html: String(file),
    toc: file.data.toc ?? [],
  }
}

export default markdownToHTML
