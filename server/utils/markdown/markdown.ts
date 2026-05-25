import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import rehypeShikiFromHighlighter from '@shikijs/rehype/core'
import { createHighlighter } from 'shiki'
import type { HighlighterGeneric, BundledLanguage, BundledTheme } from 'shiki'

export interface TocItem {
  id: string
  text: string
  depth: number
}

const myTheme = {
  name: 'my-theme',
  fg: '#1f2937',
  bg: '#ccdff7',
  settings: [
    {
      settings: {
        foreground: '#1f2937',
        background: '#ccdff7'
      }
    },
    {
      scope: ['comment', 'punctuation.definition.comment'],
      settings: {
        foreground: '#5f6f89',
        fontStyle: 'italic'
      }
    },
    {
      scope: ['keyword', 'storage', 'storage.type', 'storage.modifier'],
      settings: {
        foreground: '#da0d76'
      }
    },
    {
      scope: ['string', 'punctuation.definition.string'],
      settings: {
        foreground: '#16a1a0'
      }
    },
    {
      scope: ['constant.numeric', 'constant.language', 'support.constant'],
      settings: {
        foreground: '#7c4cc1'
      }
    },
    {
      scope: ['entity.name.function', 'support.function', 'meta.function-call'],
      settings: {
        foreground: '#4078f2'
      }
    },
    {
      scope: ['variable', 'identifier'],
      settings: {
        foreground: '#335b94'
      }
    },
    {
      scope: ['variable.parameter'],
      settings: {
        foreground: '#e06c75'
      }
    },
    {
      scope: ['entity.name.type', 'support.type', 'support.class'],
      settings: {
        foreground: '#ef5a00'
      }
    },
    {
      scope: ['entity.name.tag', 'support.class.component'],
      settings: {
        foreground: '#e06c75'
      }
    },
    {
      scope: ['entity.other.attribute-name'],
      settings: {
        foreground: '#d19a66'
      }
    },
    {
      scope: ['punctuation', 'meta.brace', 'meta.delimiter'],
      settings: {
        foreground: '#4b5563'
      }
    },
    {
      scope: ['invalid', 'invalid.illegal'],
      settings: {
        foreground: '#ffffff',
        background: '#e06c75'
      }
    }
  ]
}

// 允许 id 属性通过 sanitize（用于标题锚点）
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...(defaultSchema.attributes ?? {}),
    '*': [...(defaultSchema.attributes?.['*'] ?? []), 'id']
  }
}

function extractText(node: any): string {
  if (node.type === 'text' || node.type === 'inlineCode') return node.value
  if (node.children) return node.children.map(extractText).join('')
  return ''
}

// 提取标题并添加 id 属性，用于生成目录索引
function remarkExtractToc() {
  return (tree: any, file: any) => {
    const toc: TocItem[] = []
    const slugCount: Record<string, number> = {}

    for (const node of tree.children) {
      if (node.type === 'heading') {
        const text = extractText(node)
        const baseSlug = text.toLowerCase().trim().replace(/\s+/g, '-')
        slugCount[baseSlug] = (slugCount[baseSlug] || 0) + 1
        const id = slugCount[baseSlug] > 1
          ? `${baseSlug}-${slugCount[baseSlug]}`
          : baseSlug

        node.data = node.data || {}
        node.data.hProperties = node.data.hProperties || {}
        node.data.hProperties.id = id

        toc.push({ id, text, depth: node.depth })
      }
    }

    file.data.toc = toc
  }
}

let highlighter: HighlighterGeneric<BundledLanguage, BundledTheme> | null = null

export default async function markdownToHTML(markdown: string) {
  highlighter = !highlighter ? await createHighlighter({
    themes: [myTheme],
    langs: ['javascript', 'typescript', 'ts', 'js', 'c++', 'java', 'vue', 'html', 'vue-html']
  }) : highlighter

  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkExtractToc)
    .use(remarkRehype)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeShikiFromHighlighter, highlighter, {
      theme: 'my-theme'
    })
    .use(rehypeStringify)
    .process(markdown)

  return {
    html: String(file),
    toc: (file.data.toc || []) as TocItem[]
  }
}