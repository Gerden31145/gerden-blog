<?php

namespace App\Services;

class MarkdownService
{
  public static function render(string $markdown): array
  {
    $toc = self::extractToc($markdown);

    $parsedown = new \Parsedown();
    $parsedown->setSafeMode(true);

    $html = $parsedown->text($markdown);
    $html = self::injectHeadingIds($html, $toc);

    return [
      'html' => $html,
      'toc' => $toc
    ];
  }

  private static function extractToc(string $markdown): array
  {
    preg_match_all('/^(#{1,6})\s+(.+)$/m', $markdown, $matches, PREG_SET_ORDER);

    $toc = [];
    $slugCount = [];

    foreach ($matches as $match) {
      $depth = strlen($match[1]);
      $text = trim($match[2]);

      $baseSlug = strtolower(trim(preg_replace('/\s+/', '-', $text)));
      $slugCount[$baseSlug] = ($slugCount[$baseSlug] ?? 0) + 1;

      $id = $slugCount[$baseSlug] > 1
        ? $baseSlug . '-' . $slugCount[$baseSlug]
        : $baseSlug;

      $toc[] = [
        'id' => $id,
        'text' => $text,
        'depth' => $depth
      ];
    }

    return $toc;
  }

  private static function injectHeadingIds(string $html, array $toc): string
  {
    $index = 0;

    return preg_replace_callback('/<h([1-6])>(.*?)<\/h\1>/s', function ($matches) use (&$index, $toc) {
      if (!isset($toc[$index])) {
        return $matches[0];
      }

      $id = htmlspecialchars($toc[$index]['id'], ENT_QUOTES, 'UTF-8');
      $index++;

      return "<h{$matches[1]} id=\"{$id}\">{$matches[2]}</h{$matches[1]}>";
    }, $html);
  }
}
