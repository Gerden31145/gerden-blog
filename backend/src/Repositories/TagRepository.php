<?php

namespace App\Repositories;

use App\Core\Database;

class TagRepository
{
  public function findAll(): array
  {
    $pdo = Database::connection();

    $stmt = $pdo->query('SELECT * FROM tags');

    return $stmt->fetchAll();
  }
}
