<?php
/**
 * Dev-log PHP 测试
 * 测试 HTTP 请求 + __ready__ 探测
 */

$port = getenv('PORT') ?: '3000';
$host = getenv('HOST') ?: 'host.docker.internal';
$sessionId = 'sess_php_' . substr(md5(uniqid()), 0, 8);

function sendLog($host, $port, $sessionId, $type, $data) {
    $body = json_encode([
        'sessionId' => $sessionId,
        'time' => date('H:i:s'),
        'type' => $type,
        'data' => $data
    ]);

    $ch = curl_init("http://{$host}:{$port}");
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);

    $result = curl_exec($ch);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) {
        echo "❌ 发送失败: {$error}\n";
        return false;
    }
    return true;
}

echo "=== PHP 测试 (PORT={$port}) ===\n\n";

// 1. 探测日志
if (!sendLog($host, $port, $sessionId, '__ready__', ['runtime' => 'php', 'url' => 'docker://php'])) {
    echo "❌ 探测失败，无法连接 dev-log 服务\n";
    exit(1);
}
echo "✅ 探测成功\n";

// 2. 业务日志
sendLog($host, $port, $sessionId, 'state', ['count' => 0, 'message' => '初始化']);
echo "✅ 业务日志发送成功\n";

echo "\n✅ PHP 测试通过 (sessionId: {$sessionId})\n";
