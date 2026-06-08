<?php

namespace App\Repositories;

use App\Core\Database;
use Throwable;

class PostsRepository
{
  public function findPublishedList(): ?array
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

  public function findBySlug(string $slug): ?array
  {
    $pdo = Database::connection();

    $stmt = $pdo->prepare("
      SELECT
        p.id,
        p.title,
        p.slug,
        p.summary,
        p.content,
        p.content_html,
        p.toc,
        p.post_status,
        p.cover_image,
        p.published_at,
        t.name AS tag_name
      FROM posts p
      LEFT JOIN post_tags pt ON pt.post_id = p.id
      LEFT JOIN tags t ON t.id = pt.tags_id
      WHERE p.slug = ?
    ");

    $stmt->execute([$slug]);
    $rows = $stmt->fetchAll();

    if (!$rows) return null;

    $first = $rows[0];

    $post = [
      'id' => (string) $first['id'],
      'title' => $first['title'],
      'slug' => $first['slug'],
      'summary' => $first['summary'] ?? '',
      'content' => $first['content'],
      'post_status' => $first['post_status'],
      'coverImage' => $first['cover_image'] ?? '',
      'published_at' => $first['published_at'],
      'post_tags' => [],
      'contentHTML' => $first['content_html'],
      'toc' => $first['toc'] ? json_decode($first['toc'], true) : []
    ];

    foreach ($rows as $row) {
      if ($row['tag_name'] !== null) {
        $post['post_tags'][] = $row['tag_name'];
      }
    }

    return $post;
  }

  public function create(array $payload): array
  {
    $pdo = Database::connection();

    try {
      $pdo->beginTransaction();

      $slugBase = $payload['slug'] ?:
        $this->generateSlug($payload['title']);
      $slug = $this->generateUniqueLikeSlug($slugBase);

      $publishedAt = $payload['post_status'] === 'published'
        ? date('Y-m-d H:i:s')
        : null;

      $stmt = $pdo->prepare("
        INSERT INTO posts (
          title,
          slug,
          summary,
          content,
          content_html,
          toc,
          post_status,
          published_at,
          created_at,
          updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW()
        )
      ");

      $stmt->execute([
        $payload['title'],
        $slug,
        $payload['summary'] ?? '',
        $payload['content'],
        $payload['contentHTML'],
        json_encode($payload['toc'] ?? [], JSON_UNESCAPED_UNICODE),
        $payload['post_status'] ?? 'draft',
        $publishedAt
      ]);

      $postId = (int)$pdo->lastInsertId();

      foreach ($payload['tags'] ?? [] as $tagName) {
        $tagId = $this->findOrCreateTag($tagName);

        $tagStmt = $pdo->prepare("
          INSERT INTO post_tags (post_id, tags_id)
          VALUES (?, ?)
        ");

        $tagStmt->execute([$postId, $tagId]);
      }

      $pdo->commit();

      return [
        'id' => (string)$postId,
        'title' => $payload['title'],
        'slug' => $slug
      ];
    } catch (Throwable $e) {
      $pdo->rollBack();
      throw $e;
    }
  }

  public function deleteById(int $id): bool
  {
    $pdo = Database::connection();

    try {
      $pdo->beginTransaction();

      $checkStmt = $pdo->prepare("
        SELECT id FROM posts WHERE id = ?
      ");
      $checkStmt->execute([$id]);

      if (!$checkStmt->fetch()) {
        $pdo->rollBack();
        return false;
      }

      $deleteTagsStmt = $pdo->prepare("
        DELETE FROM post_tags WHERE post_id = ?
      ");
      $deleteTagsStmt->execute([$id]);

      $deletePostStmt = $pdo->prepare("
        DELETE FROM posts WHERE id = ?
      ");
      $deletePostStmt->execute([$id]);

      $pdo->commit();

      return true;
    } catch (Throwable $e) {
      $pdo->rollBack();
      throw $e;
    }
  }

  public function updateById(int $id, array $payload): ?array
  {
    $pdo = Database::connection();

    try {
      $pdo->beginTransaction();

      $stmt = $pdo->prepare("
        SELECT id, title, slug, published_at
        FROM posts
        WHERE id = ?
      ");
      $stmt->execute([$id]);

      $oldPost = $stmt->fetch();

      if (!$oldPost) {
        $pdo->rollBack();
        return null;
      }

      $slug = $oldPost['slug'];

      if ($oldPost['title'] !== $payload['title']) {
        $slug = $this->generateUniqueLikeSlug(
          $this->generateSlug($payload['title'])
        );
      }

      $publishedAt = $oldPost['published_at'];

      if ($payload['post_status'] === 'published' && !$publishedAt) {
        $publishedAt = date('Y-m-d H:i:s');
      }

      if ($payload['post_status'] !== 'published') {
        $publishedAt = null;
      }

      $stmt = $pdo->prepare("
        UPDATE posts
        SET
          title = ?,
          slug = ?,
          summary = ?,
          content = ?,
          content_html = ?,
          toc = ?,
          post_status = ?,
          published_at = ?,
          updated_at = NOW()
        WHERE id = ?
      ");

      $stmt->execute([
        $payload['title'],
        $slug,
        $payload['summary'] ?? '',
        $payload['content'],
        $payload['contentHTML'],
        json_encode($payload['toc'] ?? [], JSON_UNESCAPED_UNICODE),
        $payload['post_status'] ?? 'draft',
        $publishedAt,
        $id
      ]);

      $deleteTagStmt = $pdo->prepare("
        DELETE FROM post_tags
        WHERE post_id = ?
      ");
      $deleteTagStmt->execute([$id]);

      foreach ($payload['tags'] ?? [] as $tagName) {
        $tagId = $this->findOrCreateTag($tagName);

        $tagStmt = $pdo->prepare("
      INSERT INTO post_tags (post_id, tags_id)
      VALUES (?, ?)
    ");

        $tagStmt->execute([$id, $tagId]);
      }

      $pdo->commit();

      return [
        'id' => (string)$id,
        'title' => $payload['title'],
        'slug' => $slug,
        'post_status' => $payload['post_status'] ?? 'draft',
      ];
    } catch (Throwable $e) {
      if ($pdo->inTransaction()) {
        $pdo->rollBack();
      }

      throw $e;
    }
  }

  private function findOrCreateTag(string $name): int
  {
    $pdo = Database::connection();

    $name = trim($name);

    if ($name === '') {
      throw new \Exception('标签名不能为空');
    }

    $stmt = $pdo->prepare("
      SELECT id FROM tags WHERE name = ?
    ");

    $stmt->execute([$name]);

    $tag = $stmt->fetch();

    if ($tag) {
      return (int)$tag['id'];
    }

    $slug = $this->generateUniqueLikeSlug($this->generateSlug($name));

    $insertStmt = $pdo->prepare("
      INSERT INTO tags (name, slug, created_at)
      VALUES (?, ?, NOW())
    ");

    $insertStmt->execute([$name, $slug]);

    return (int)$pdo->lastInsertId();
  }

  private function generateSlug(string $title): string
  {
    $slug = trim(mb_strtolower($title, 'UTF-8'));
    $slug = preg_replace('/[^\p{L}\p{N}]+/u', '-', $slug);
    $slug = trim($slug, '-');

    return $slug !== '' ? $slug : 'post';
  }

  private function generateUniqueLikeSlug(string $baseSlug): string
  {
    $baseSlug = trim($baseSlug, '-');

    if ($baseSlug === '') {
      $baseSlug = 'post';
    }

    $timestamp = time();
    $random = bin2hex(random_bytes(3));

    return "{$baseSlug}-{$timestamp}-{$random}";
  }
}
