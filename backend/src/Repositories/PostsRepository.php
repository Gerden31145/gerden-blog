<?php

namespace App\Repositories;

use App\Core\Database;

class PostsRepository
{
  public function findPublishedList(): array
  {
    $pdo = Database::connection();

    $stmt = $pdo->query("
      SELECT
        p.id,
        p.title,
        p.summary,
        p.slug,
        p.published_at,
        p.post_status,
        t.name AS tag_name
      FROM posts p
      LEFT JOIN post_tags pt ON pt.post_id = p.id
      LEFT JOIN tags t ON t.id = pt.tags_id
      WHERE p.post_status = 'published'
      ORDER BY p.published_at DESC, p.created_at DESC 
    ");

    $rows = $stmt->fetchAll();

    $posts = [];

    foreach ($rows as $row) {
      $id = (string)$row['id'];

      if (!isset($posts[$id])) {
        $posts[$id] = [
          'id' => $id,
          'title' => $row['title'],
          'summary' => $row['summary'] ?? '',
          'slug' => $row['slug'],
          'published_at' => $row['published_at'],
          'post_status' => $row['post_status'],
          'tags' => []
        ];
      }

      if ($row['tag_name'] !== null) {
        $posts[$id]['tags'][] = $row['tag_name'];
      }
    }

    return array_values($posts);
  }
}
