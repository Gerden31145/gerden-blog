<?php

namespace App\Controller;

use App\Core\Response;
use App\Middleware\AuthMiddleware;
use App\Repositories\UserRepository;
use App\Services\JwtService;
use Throwable;

class AuthController
{
  private UserRepository $userRepo;
  private JwtService $jwtService;

  public function __construct()
  {
    $this->userRepo = new UserRepository();
    $this->jwtService = new JwtService();
  }

  public function register(array $param = []): void
  {
    $body = $this->jsonBody();
    $username = trim((string)($body['username'] ?? ''));
    $email = strtolower(trim((string)($body['email'] ?? '')));
    $password = (string)($body['password'] ?? '');

    if (
      strlen($username) < 3 ||
      strlen($username) > 64 ||
      !preg_match('/^[A-Za-z0-9_]+$/', $username)
    ) {
      Response::error('用户名必须是 3-64 位字母、数字或下划线', 400);
    }

    if (strlen($email) > 255 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
      Response::error('邮箱格式错误', 400);
    }

    if (strlen($password) < 6) {
      Response::error('密码至少需要 6 位', 400);
    }

    if ($this->userRepo->findByUsername($username)) {
      Response::error('用户名已存在', 409);
    }

    if ($this->userRepo->findByEmail($email)) {
      Response::error('邮箱已存在', 409);
    }

    $user = $this->userRepo->create([
      'username' => $username,
      'email' => $email,
      'password' => $password,
    ]);

    Response::success($this->publicUser($user), '注册成功', 201);
  }

  public function login(array $param = []): void
  {
    $user = $this->attemptLogin();

    $this->respondWithToken($user);
  }

  public function adminLogin(array $param = []): void
  {
    $user = $this->attemptLogin();

    if ($user['role'] !== 'admin') {
      Response::error('无后台访问权限', 403);
    }

    $this->respondWithToken($user);
  }

  private function attemptLogin(): array
  {
    $body = $this->jsonBody();
    $username = trim((string)($body['username'] ?? ''));
    $password = (string)($body['password'] ?? '');

    if ($username === '' || $password === '') {
      Response::error('用户名或密码不能为空', 400);
    }

    $user = $this->userRepo->findByUsername($username);

    if (!$user || !password_verify($password, (string)$user['password_hash'])) {
      Response::error('用户名或密码错误', 401);
    }

    if ($user['status'] !== 'active') {
      Response::error('用户已被禁用', 403);
    }

    return $user;
  }

  private function respondWithToken(array $user): void
  {
    $token = $this->jwtService->generate($user);

    setcookie(
      $this->jwtService->cookieName(),
      $token,
      $this->jwtService->cookieOptions()
    );

    Response::success([
      'ok' => true,
      'user' => $this->publicUser($user),
    ], '登录成功');
  }

  public function me(array $param = []): void
  {
    $user = AuthMiddleware::requireAuth();

    Response::success($this->publicUser($user), '已登录');
  }

  public function adminMe(array $param = []): void
  {
    $user = AuthMiddleware::requireAdmin();

    Response::success($this->publicUser($user), '管理员已登录');
  }

  public function logout(array $param = []): void
  {
    $cookieName = $this->jwtService->cookieName();
    $token = $_COOKIE[$cookieName] ?? '';

    if ($token !== '') {
      try {
        $payload = $this->jwtService->verify($token);
        $userId = isset($payload->sub) ? (int)$payload->sub : 0;

        if ($userId > 0) {
          $this->userRepo->incrementTokenVersion($userId);
        }
      } catch (Throwable $e) {
      }
    }

    setcookie(
      $cookieName,
      '',
      $this->jwtService->cookieOptions(time() - 3600)
    );

    Response::success(['ok' => true], '退出登录成功');
  }

  private function jsonBody(): array
  {
    $rawBody = file_get_contents('php://input');

    if ($rawBody === false || trim($rawBody) === '') {
      return [];
    }

    $data = json_decode($rawBody, true);

    return is_array($data) ? $data : [];
  }

  private function publicUser(array $user): array
  {
    return [
      'id' => (string)$user['id'],
      'username' => $user['username'],
      'email' => $user['email'],
      'role' => $user['role'],
    ];
  }
}
