<?php

namespace App\Repositories;

use App\Core\Database;

class UserRepository
{
  public function findByUsername(string $username): ?array
  {
    $pdo = Database::connection();

    $stmt = $pdo->prepare("
      SELECT
        id,
        username,
        email,
        password_hash,
        role,
        status,
        token_version,
        created_at,
        updated_at
      FROM users
      WHERE username = ?
      LIMIT 1
    ");

    $stmt->execute([$username]);
    $user = $stmt->fetch();

    return $user ?: null;
  }

  public function findByEmail(string $email): ?array
  {
    $pdo = Database::connection();

    $stmt = $pdo->prepare("
      SELECT
        id,
        username,
        email,
        password_hash,
        role,
        status,
        token_version,
        created_at,
        updated_at
      FROM users
      WHERE email = ?
      LIMIT 1
    ");

    $stmt->execute([$email]);
    $user = $stmt->fetch();

    return $user ?: null;
  }

  public function findById(int $id): ?array
  {
    $pdo = Database::connection();

    $stmt = $pdo->prepare("
      SELECT
        id,
        username,
        email,
        password_hash,
        role,
        status,
        token_version,
        created_at,
        updated_at
      FROM users
      WHERE id = ?
      LIMIT 1
    ");

    $stmt->execute([$id]);
    $user = $stmt->fetch();

    return $user ?: null;
  }

  public function create(array $payload): array
  {
    $pdo = Database::connection();

    $stmt = $pdo->prepare("
      INSERT INTO users (username, email, password_hash, role, status)
      VALUES (?, ?, ?, 'user', 'active')
    ");

    $stmt->execute([
      $payload['username'],
      $payload['email'],
      password_hash($payload['password'], PASSWORD_DEFAULT),
    ]);

    $user = $this->findById((int)$pdo->lastInsertId());

    if (!$user) {
      throw new \RuntimeException('用户创建失败');
    }

    return $user;
  }

  public function incrementTokenVersion(int $id): bool
  {
    $pdo = Database::connection();

    $stmt = $pdo->prepare("
      UPDATE users
      SET token_version = token_version + 1
      WHERE id = ?
    ");

    $stmt->execute([$id]);

    return $stmt->rowCount() > 0;
  }
}
