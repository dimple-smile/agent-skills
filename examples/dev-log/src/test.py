#!/usr/bin/env python3
"""
Dev-log Python 测试
测试 HTTP 请求 + __ready__ 探测
"""

import os
import urllib.request
import json
import time
import random
import string

PORT = os.environ.get('PORT', '3000')
HOST = os.environ.get('HOST', 'host.docker.internal')
SESSION_ID = 'sess_py_' + ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))

def send_log(log_type: str, data: dict) -> bool:
    body = json.dumps({
        'sessionId': SESSION_ID,
        'time': time.strftime('%H:%M:%S'),
        'type': log_type,
        'data': data
    }).encode('utf-8')

    req = urllib.request.Request(
        f'http://{HOST}:{PORT}',
        data=body,
        headers={'Content-Type': 'application/json'},
        method='POST'
    )

    try:
        urllib.request.urlopen(req, timeout=5)
        return True
    except Exception as e:
        print(f'❌ 发送失败: {e}')
        return False

def main():
    print(f'=== Python 测试 (PORT={PORT}) ===\n')

    # 1. 探测日志
    if not send_log('__ready__', {'runtime': 'python', 'url': 'docker://py'}):
        print('❌ 探测失败，无法连接 dev-log 服务')
        exit(1)
    print('✅ 探测成功')

    # 2. 业务日志
    send_log('state', {'count': 0, 'message': '初始化'})
    print('✅ 业务日志发送成功')

    print(f'\n✅ Python 测试通过 (sessionId: {SESSION_ID})')

if __name__ == '__main__':
    main()
