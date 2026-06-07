<?php

namespace App\Core;

class Response
{
  public static function success($data = null, string $message = 'success', int $statusCode = 200): void
  {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');

    echo json_encode([
      'status' => 'success',
      'message' => $message,
      'data' => $data
    ], JSON_UNESCAPED_UNICODE);

    exit;
  }

  public static function error(string $message = 'error', int $statusCode = 500): void
  {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');

    echo json_encode([
      'status' => $statusCode,
      'message' => $message
    ], JSON_UNESCAPED_UNICODE);
    exit;
  }
}
