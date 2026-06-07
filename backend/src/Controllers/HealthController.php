<?php

namespace App\Controller;

use App\Core\Response;
use App\Core\Database;

class HealthController
{
  public function index(array $param = []): void
  {
    $pdo = Database::connection();

    $stmt = $pdo->query('SELECT * FROM tags');
    $posts = $stmt->fetchAll();

    Response::success($posts);
  }
}
