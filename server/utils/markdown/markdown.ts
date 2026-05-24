import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeSanitize from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import rehypeShiki from '@shikijs/rehype'
import rehypeShikiFromHighlighter from '@shikijs/rehype/core'
import { createHighlighter } from 'shiki'
import type { HighlighterGeneric, BundledLanguage, BundledTheme } from 'shiki'

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

let highlighter: HighlighterGeneric<BundledLanguage, BundledTheme> | null = null // highligher实例

export default async function markdownToHTML(markdown: string) {
  highlighter = !highlighter ? await createHighlighter({
    themes: [myTheme],
    langs: ['javascript', 'typescript', 'ts', 'js', 'c++', 'java', 'vue']
  }) : highlighter

  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSanitize)
    .use(rehypeShikiFromHighlighter, highlighter, {
      // or `theme` for a single theme
      theme: 'my-theme'
    })
    .use(rehypeStringify)
    .process(markdown)

  return String(file)
}