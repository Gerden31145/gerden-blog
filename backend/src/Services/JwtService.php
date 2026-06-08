<?php

namespace App\Services;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class JwtService
{
  private array $config;

  public function __construct(?array $config = null)
  {
    $this->config = $config ?? require __DIR__ . '/../../config/auth.php';
  }

  public function generate(array $user): string
  {
    $now = time();

    $payload = [
      'sub' => (int)$user['id'],
      'username' => (string)$user['username'],
      'role' => (string)($user['role'] ?? 'user'),
      'token_version' => (int)($user['token_version'] ?? 0),
      'iat' => $now,
      'exp' => $now + (int)$this->config['jwt_expire_seconds'],
    ];

    return JWT::encode($payload, $this->secret(), $this->algorithm());
  }

  public function verify(string $token): object
  {
    return JWT::decode($token, new Key($this->secret(), $this->algorithm()));
  }

  public function cookieName(): string
  {
    return (string)$this->config['cookie_name'];
  }

  public function cookieOptions(?int $expires = null): array
  {
    return [
      'expires' => $expires ?? time() + (int)$this->config['jwt_expire_seconds'],
      'path' => (string)$this->config['cookie_path'],
      'secure' => (bool)$this->config['cookie_secure'],
      'httponly' => (bool)$this->config['cookie_http_only'],
      'samesite' => (string)$this->config['cookie_same_site'],
    ];
  }

  private function secret(): string
  {
    return (string)$this->config['jwt_secret'];
  }

  private function algorithm(): string
  {
    return (string)$this->config['jwt_algorithm'];
  }
}
