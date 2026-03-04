// Dev-log Dart 测试
// 测试 HTTP 请求 + __ready__ 探测

import 'dart:convert';
import 'dart:io';
import 'dart:math';

Future<void> main() async {
  final port = Platform.environment['PORT'] ?? '3000';
  final host = Platform.environment['HOST'] ?? 'host.docker.internal';
  final sessionId = 'sess_dart_${Random().nextInt(90000000) + 10000000}';

  print('=== Dart 测试 (PORT=$port) ===\n');

  final client = HttpClient();
  client.connectionTimeout = const Duration(seconds: 5);

  Future<bool> sendLog(String type, Map<String, dynamic> data) async {
    final time = DateTime.now().toString().split(' ')[1].substring(0, 8);
    final body = jsonEncode({
      'sessionId': sessionId,
      'time': time,
      'type': type,
      'data': data,
    });

    try {
      final request = await client.post(host, int.parse(port), '/');
      request.headers.contentType = ContentType.json;
      request.write(body);
      final response = await request.close();
      await response.drain();
      return response.statusCode == 200;
    } catch (e) {
      print('❌ 发送失败: $e');
      return false;
    }
  }

  // 1. 探测日志
  if (!await sendLog('__ready__', {'runtime': 'dart', 'url': 'docker://dart'})) {
    print('❌ 探测失败，无法连接 dev-log 服务');
    exit(1);
  }
  print('✅ 探测成功');

  // 2. 业务日志
  await sendLog('state', {'count': 0, 'message': '初始化'});
  print('✅ 业务日志发送成功');

  print('\n✅ Dart 测试通过 (sessionId: $sessionId)');

  client.close();
}
