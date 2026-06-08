<?php

namespace App\Middleware;

use App\Core\Response;
use App\Repositories\UserRepository;
use App\Services\JwtService;
use Throwable;

class AuthMiddleware
{
  public static function requireAdmin(): array
  {
    $user = self::requireAuth();

    if ($user['role'] !== 'admin') {
      Response::error('无后台访问权限', 403);
    }

    return $user;
  }

  public static function requireAuth(): array
  {
    $jwtService = new JwtService();
    $cookieName = $jwtService->cookieName();
    $token = $_COOKIE[$cookieName] ?? '';

    if ($token === '') {
      Response::error('Unauthorized', 401);
    }

    try {
      $payload = $jwtService->verify($token);
    } catch (Throwable $e) {
      Response::error('Unauthorized', 401);
    }

    $userId = isset($payload->sub) ? (int)$payload->sub : 0;

    if ($userId <= 0) {
      Response::error('Unauthorized', 401);
    }

    $userRepo = new UserRepository();
    $user = $userRepo->findById($userId);

    if (!$user || $user['status'] !== 'active') {
      Response::error('Unauthorized', 401);
    }

    $payloadTokenVersion = isset($payload->token_version)
      ? (int)$payload->token_version
      : -1;

    if ($payloadTokenVersion !== (int)$user['token_version']) {
      Response::error('Unauthorized', 401);
    }

    return $user;
  }
}
