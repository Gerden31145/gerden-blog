<?php
require __DIR__ . '/../src/Core/Response.php';
require __DIR__ . '/../src/Core/Router.php';
require __DIR__ . '/../src/Controllers/HealthController.php';
require __DIR__ . '/../src/Core/Database.php';
require __DIR__ . '/../src/Repositories/TagRepository.php';
require __DIR__ . '/../src/Controllers/TagsController.php';
require __DIR__ . '/../src/Repositories/PostsRepository.php';
require __DIR__ . '/../src/Controllers/PostsController.php';

use App\Core\Response;
use App\Core\Router;

header('Access-Control-Allow-Origin: http://localhost:3000');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

$router = new Router();

require __DIR__ . '/../routes/api.php';

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

try {
  $router->dispatch($path, $method);
} catch (Throwable $e) {
  Response::error($e->getMessage(), 500);
}
