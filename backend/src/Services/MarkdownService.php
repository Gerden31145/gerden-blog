<?php

namespace App\Services;

class MarkdownService
{
  public static function render(string $markdown): array
  {
    $parsedown = new \Parsedown();
    $parsedown->setSafeMode(true);

    $html = $parsedown->text($markdown);

    return self::injectHeadingIdsAndExtractToc($html);
  }

  private static function injectHeadingIdsAndExtractToc(string $html): array
  {
    if (!class_exists(\DOMDocument::class)) {
      throw new \RuntimeException('PHP DOM extension is not enabled');
    }

    $dom = new \DOMDocument('1.0', 'UTF-8');
    $previousErrorState = libxml_use_internal_errors(true);

    $dom->loadHTML(
      '<?xml encoding="UTF-8"><div id="markdown-root">' . $html . '</div>',
      LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD
    );

    libxml_clear_errors();
    libxml_use_internal_errors($previousErrorState);

    $root = self::findMarkdownRoot($dom);

    if (!$root) {
      return [
        'html' => $html,
        'toc' => []
      ];
    }

    $xpath = new \DOMXPath($dom);
    $headings = $xpath->query(
      './/*[self::h1 or self::h2 or self::h3 or self::h4 or self::h5 or self::h6]',
      $root
    );

    $toc = [];
    $slugCount = [];

    foreach ($headings as $heading) {
      if (!$heading instanceof \DOMElement) {
        continue;
      }

      $text = trim(preg_replace('/\s+/u', ' ', $heading->textContent));

      if ($text === '') {
        continue;
      }

      $id = self::generateHeadingId($text, $slugCount);
      $heading->setAttribute('id', $id);

      $toc[] = [
        'id' => $id,
        'text' => $text,
        'depth' => (int) substr($heading->tagName, 1)
      ];
    }

    return [
      'html' => self::innerHtml($dom, $root),
      'toc' => $toc
    ];
  }

  private static function findMarkdownRoot(\DOMDocument $dom): ?\DOMElement
  {
    foreach ($dom->getElementsByTagName('div') as $node) {
      if ($node instanceof \DOMElement && $node->getAttribute('id') === 'markdown-root') {
        return $node;
      }
    }

    return null;
  }

  private static function generateHeadingId(string $text, array &$slugCount): string
  {
    $baseSlug = self::slugify($text);
    $slugCount[$baseSlug] = ($slugCount[$baseSlug] ?? 0) + 1;

    return $slugCount[$baseSlug] > 1
      ? $baseSlug . '-' . $slugCount[$baseSlug]
      : $baseSlug;
  }

  private static function slugify(string $text): string
  {
    $text = function_exists('mb_strtolower')
      ? mb_strtolower($text, 'UTF-8')
      : strtolower($text);

    $slug = preg_replace('/[^\p{L}\p{N}]+/u', '-', $text);
    $slug = trim($slug, '-');

    return $slug !== '' ? $slug : 'section';
  }

  private static function innerHtml(\DOMDocument $dom, \DOMElement $element): string
  {
    $html = '';

    foreach ($element->childNodes as $child) {
      $html .= $dom->saveHTML($child);
    }

    return $html;
  }
}
