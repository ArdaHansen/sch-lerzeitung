<?php
declare(strict_types=1);

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);

if (is_string($path) && ($path === '/data' || str_starts_with($path, '/data/'))) {
    http_response_code(404);
    exit;
}

return false;
