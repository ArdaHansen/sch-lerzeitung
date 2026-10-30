<?php
declare(strict_types=1);

session_name('wida_redaktion');
ini_set('session.gc_maxlifetime', '1800');
session_set_cookie_params([
    'lifetime' => 1800,
    'httponly' => true,
    'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    'samesite' => 'Strict',
    'path' => '/',
]);
session_start();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function respond(array $data, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function read_posts(string $path): array
{
    if (!is_file($path)) {
        return [];
    }

    $contents = file_get_contents($path);
    $posts = $contents === false ? null : json_decode($contents, true);
    return is_array($posts) ? $posts : [];
}

function read_site(string $path): array
{
    $defaults = [
        'theme' => [
            'title' => 'Artikel folgt.',
            'text' => 'Der erste Artikel erscheint bald.',
        ],
        'appearance' => [
            'brand' => 'WIDA ON PAPER',
            'background' => '#000000',
            'textColor' => '#ffffff',
            'accentColor' => '#a0a0a0',
            'alignment' => 'center',
        ],
        'blocks' => [],
    ];
    $contents = is_file($path) ? file_get_contents($path) : false;
    $site = $contents === false ? null : json_decode($contents, true);
    return is_array($site) && isset($site['theme']) ? array_replace_recursive($defaults, $site) : $defaults;
}

function is_local_request(): bool
{
    $host = strtolower((string) parse_url('http://' . ($_SERVER['HTTP_HOST'] ?? ''), PHP_URL_HOST));
    return in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true)
        && in_array($host, ['localhost', '127.0.0.1', '::1'], true);
}

function write_json(string $path, array $value): bool
{
    $json = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    return $json !== false && file_put_contents($path, $json, LOCK_EX) !== false;
}

function clean_text(mixed $value, int $maxLength): string
{
    if (!is_string($value)) {
        return '';
    }

    $value = trim(strip_tags($value));
    return function_exists('mb_substr') ? mb_substr($value, 0, $maxLength) : substr($value, 0, $maxLength);
}

$action = $_GET['action'] ?? '';
$dataPath = __DIR__ . '/data/posts.json';
$sitePath = __DIR__ . '/data/settings.json';

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'posts') {
    respond(['posts' => read_posts($dataPath)]);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'status') {
    respond(['authenticated' => !empty($_SESSION['is_editor'])]);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'site') {
    respond(['site' => read_site($sitePath)]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(['error' => 'Methode nicht erlaubt.'], 405);
}

$input = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($input)) {
    respond(['error' => 'Ungültige Anfrage.'], 400);
}

if ($action === 'login') {
    $configuredPassword = getenv('WIDA_ADMIN_PASSWORD');
    if ($configuredPassword === false && is_local_request()) {
        $configuredPassword = '2506';
    }
    if ($configuredPassword === false || strlen($configuredPassword) < 16) {
        respond(['error' => 'Das Admin-Passwort ist auf dem Server noch nicht sicher eingerichtet. Setze WIDA_ADMIN_PASSWORD auf mindestens 16 Zeichen.'], 503);
    }

    if (($_SESSION['login_locked_until'] ?? 0) > time()) {
        respond(['error' => 'Zu viele Fehlversuche. Bitte warte 15 Minuten und versuche es erneut.'], 429);
    }

    if (!hash_equals($configuredPassword, (string) ($input['password'] ?? ''))) {
        $_SESSION['login_attempts'] = ($_SESSION['login_attempts'] ?? 0) + 1;
        if ($_SESSION['login_attempts'] >= 5) {
            $_SESSION['login_locked_until'] = time() + 900;
        }
        respond(['error' => 'Das Passwort stimmt nicht.'], 401);
    }

    session_regenerate_id(true);
    unset($_SESSION['login_attempts'], $_SESSION['login_locked_until']);
    $_SESSION['is_editor'] = true;
    respond(['authenticated' => true]);
}

if ($action === 'logout') {
    $_SESSION = [];
    session_destroy();
    respond(['authenticated' => false]);
}

if (!in_array($action, ['create', 'saveSite'], true) || empty($_SESSION['is_editor'])) {
    respond(['error' => 'Bitte melde dich zuerst im Redaktionsbereich an.'], 401);
}

if ($action === 'saveSite') {
    $siteInput = $input['site'] ?? null;
    if (!is_array($siteInput) || !is_array($siteInput['theme'] ?? null) || !is_array($siteInput['appearance'] ?? null) || !is_array($siteInput['blocks'] ?? null)) {
        respond(['error' => 'Die Startseiten-Daten sind ungültig.'], 422);
    }

    $theme = [
        'title' => clean_text($siteInput['theme']['title'] ?? null, 120),
        'text' => clean_text($siteInput['theme']['text'] ?? null, 500),
    ];
    $appearance = [
        'brand' => clean_text($siteInput['appearance']['brand'] ?? null, 60),
        'background' => clean_text($siteInput['appearance']['background'] ?? null, 7),
        'textColor' => clean_text($siteInput['appearance']['textColor'] ?? null, 7),
        'accentColor' => clean_text($siteInput['appearance']['accentColor'] ?? null, 7),
        'alignment' => clean_text($siteInput['appearance']['alignment'] ?? null, 10),
    ];
    $validColor = static fn (string $color): bool => preg_match('/^#[0-9a-fA-F]{6}$/', $color) === 1;
    if ($theme['title'] === '' || $appearance['brand'] === '' || count($siteInput['blocks']) > 20
        || !$validColor($appearance['background']) || !$validColor($appearance['textColor'])
        || !$validColor($appearance['accentColor'])
        || !in_array($appearance['alignment'], ['left', 'center', 'right'], true)) {
        respond(['error' => 'Bitte prüfe Überschrift, Name, Farben und Textausrichtung.'], 422);
    }

    $blocks = [];
    foreach ($siteInput['blocks'] as $block) {
        if (!is_array($block) || !in_array($block['type'] ?? '', ['heading', 'text', 'highlight', 'link'], true)) {
            continue;
        }
        $title = clean_text($block['title'] ?? null, 120);
        $text = clean_text($block['text'] ?? null, 1000);
        $url = clean_text($block['url'] ?? null, 1000);
        if ($url !== '' && (!filter_var($url, FILTER_VALIDATE_URL) || !in_array(parse_url($url, PHP_URL_SCHEME), ['http', 'https'], true))) {
            respond(['error' => 'Links benötigen eine gültige HTTP- oder HTTPS-Adresse.'], 422);
        }
        if ($title !== '' || $text !== '') {
            $blocks[] = ['type' => $block['type'], 'title' => $title, 'text' => $text, 'url' => $url];
        }
    }

    $site = ['theme' => $theme, 'appearance' => $appearance, 'blocks' => $blocks];
    if (!write_json($sitePath, $site)) {
        respond(['error' => 'Die Startseite konnte nicht gespeichert werden. Prüfe die Schreibrechte im data-Ordner.'], 500);
    }
    respond(['site' => $site]);
}

$title = clean_text($input['title'] ?? null, 120);
$category = clean_text($input['category'] ?? null, 40);
$author = clean_text($input['author'] ?? null, 60);
$teaser = clean_text($input['teaser'] ?? null, 220);
$content = clean_text($input['content'] ?? null, 12000);
$image = clean_text($input['image'] ?? null, 1000);
$allowedBlockTypes = ['paragraph', 'heading', 'quote', 'list'];
$blocks = [];
if (is_array($input['blocks'] ?? null)) {
    foreach (array_slice($input['blocks'], 0, 40) as $block) {
        if (is_array($block) && in_array($block['type'] ?? '', $allowedBlockTypes, true)) {
            $text = clean_text($block['text'] ?? null, 12000);
            if ($text !== '') {
                $blocks[] = ['type' => $block['type'], 'text' => $text];
            }
        }
    }
}

if ($title === '' || $category === '' || $author === '' || $teaser === '' || $content === '') {
    respond(['error' => 'Bitte fülle alle Pflichtfelder aus.'], 422);
}

if ($image !== '' && (!filter_var($image, FILTER_VALIDATE_URL) || !in_array(parse_url($image, PHP_URL_SCHEME), ['http', 'https'], true))) {
    respond(['error' => 'Das Bild benötigt eine gültige HTTP- oder HTTPS-Adresse.'], 422);
}

$directory = dirname($dataPath);
if (!is_dir($directory) && !mkdir($directory, 0755, true) && !is_dir($directory)) {
    respond(['error' => 'Der Speicherordner konnte nicht angelegt werden.'], 500);
}

$handle = fopen($dataPath, 'c+');
if ($handle === false || !flock($handle, LOCK_EX)) {
    respond(['error' => 'Beiträge können gerade nicht gespeichert werden.'], 500);
}

$stored = stream_get_contents($handle);
$posts = is_string($stored) ? json_decode($stored, true) : null;
if (!is_array($posts)) {
    $posts = [];
}

$post = [
    'id' => bin2hex(random_bytes(8)),
    'title' => $title,
    'category' => $category,
    'author' => $author,
    'teaser' => $teaser,
    'content' => $content,
    'blocks' => $blocks,
    'image' => $image,
    'publishedAt' => gmdate(DATE_ATOM),
];
array_unshift($posts, $post);

rewind($handle);
ftruncate($handle, 0);
$saved = fwrite($handle, json_encode($posts, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT));
fflush($handle);
flock($handle, LOCK_UN);
fclose($handle);

if ($saved === false) {
    respond(['error' => 'Der Beitrag konnte nicht gespeichert werden.'], 500);
}

respond(['post' => $post], 201);