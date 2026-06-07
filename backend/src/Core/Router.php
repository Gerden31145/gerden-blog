<?php

namespace App\Core;

class Router
{
  private array $route = [];

  public function addPath(string $path, string $method, callable $handler): void
  {
    $this->route[$method][] = [
      'path' => $this->normalize($path),
      'handler' => $handler
    ];
  }

  public function normalize(string $path): string
  {
    $path = "/" . trim($path, '/');
    return $path;
  }

  public function dispatch(string $path, string $method): void
  {
    $path = $this->normalize($path);

    $routes = $this->route[$method] ?? [];

    foreach ($routes as $route) {
      $parma = $this->match($route['path'], $path);

      if ($parma !== null) {
        $route['handler']($parma);
        return;
      }
    }

    Response::error('Route not found', 404);
  }

  private function match(string $routePath, string $requestPath): ?array
  {
    $routeParts = $this->splitPath($routePath);
    $requestParts = $this->splitPath($requestPath);

    if (count($routeParts) !== count($requestParts)) {
      return null;
    }

    $params = [];

    foreach ($routeParts as $index => $routePart) {
      $requestPart = $requestParts[$index];

      if (str_starts_with($routePart, '{') && str_ends_with($routePart, '}')) {
        $paramName = trim($routePart, '{}');
        $params[$paramName] = urldecode($requestPart);
        continue;
      }

      if ($routePart !== $requestPart) {
        return null;
      }
    }

    return $params;
  }

  private function splitPath(string $path): array
  {
    $path = trim($path, '/');
    return $path === '' ? [] : explode('/', $path);
  }
}
