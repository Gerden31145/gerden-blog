<?php

namespace App\Repositories;

use App\Core\Database;

class CommentsRepository
{
  public function create(int $postId, int $userId, string $content): array
  {
    $pdo = Database::connection();

    $stmt = $pdo->prepare("
      INSERT INTO comments (
        post_id,
        user_id,
        content,
        status,
        created_at,
        updated_at
      ) VALUES (
        ?, ?, ?, 'visible', NOW(), NOW()
      )
    ");

    $stmt->execute([$postId, $userId, $content]);

    $comment = $this->findById((int)$pdo->lastInsertId());

    if (!$comment) {
      throw new \RuntimeException('评论创建失败');
    }

    return $comment;
  }

  public function findById(int $id): ?array
  {
    $pdo = Database::connection();

    $stmt = $pdo->prepare("
      SELECT
        c.id,
        c.post_id,
        c.user_id,
        c.content,
        c.status,
        c.created_at,
        c.updated_at,
        u.username
      FROM comments c
      INNER JOIN users u ON u.id = c.user_id
      WHERE c.id = ?
      LIMIT 1
    ");

    $stmt->execute([$id]);
    $row = $stmt->fetch();

    return $row ? $this->mapComment($row) : null;
  }

  public function softDeleteById(int $id): bool
  {
    $pdo = Database::connection();

    $stmt = $pdo->prepare("
      UPDATE comments
      SET
        status = 'deleted',
        updated_at = NOW()
      WHERE id = ?
        AND status <> 'deleted'
    ");

    $stmt->execute([$id]);

    return $stmt->rowCount() > 0;
  }

  public function publishedPostExists(int $postId): bool
  {
    $pdo = Database::connection();

    $stmt = $pdo->prepare("
      SELECT id
      FROM posts
      WHERE id = ?
        AND post_status = 'published'
      LIMIT 1
    ");

    $stmt->execute([$postId]);

    return (bool)$stmt->fetch();
  }

  public function findByPostIdAndStatus(int $postId, string $status = 'visible'): array
  {
    $pdo = Database::connection();

    $stmt = $pdo->prepare("
      SELECT
        c.id,
        c.post_id,
        c.user_id,
        c.content,
        c.status,
        c.created_at,
        c.updated_at,
        u.username
      FROM comments c
      INNER JOIN users u ON u.id = c.user_id
      WHERE c.post_id = ?
        AND c.status = ?
      ORDER BY c.created_at ASC, c.id ASC
    ");

    $stmt->execute([$postId, $status]);
    $rows = $stmt->fetchAll();

    return array_map([$this, 'mapComment'], $rows);
  }

  private function mapComment(array $row): array
  {
    return [
      'id' => (string)$row['id'],
      'post_id' => (string)$row['post_id'],
      'user_id' => (string)$row['user_id'],
      'content' => $row['content'],
      'status' => $row['status'],
      'created_at' => $row['created_at'],
      'updated_at' => $row['updated_at'],
      'user' => [
        'id' => (string)$row['user_id'],
        'username' => $row['username'],
      ],
    ];
  }
}
