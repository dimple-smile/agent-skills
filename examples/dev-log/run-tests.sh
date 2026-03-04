#!/bin/bash
#
# Dev-log 多语言测试脚本
# 一键运行所有语言的测试
#
# 使用方式：
# 1. 先启动 dev-log 服务: cd ../../skills/dev-log && node dist/index.cjs
# 2. 运行测试: ./run-tests.sh
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT_FILE="$SCRIPT_DIR/../../skills/dev-log/port.txt"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================"
echo "  Dev-log 多语言测试"
echo "========================================"
echo ""

# 检查 dev-log 服务是否启动
if [ ! -f "$PORT_FILE" ]; then
    echo -e "${RED}❌ dev-log 服务未启动${NC}"
    echo ""
    echo "请先启动服务:"
    echo "  cd ../../skills/dev-log && node dist/index.cjs"
    exit 1
fi

# 读取端口
PORT=$(cat "$PORT_FILE" | tr -d '[:space:]')
echo -e "📡 dev-log 服务端口: ${YELLOW}$PORT${NC}"
echo ""

# 检查服务是否可达
echo "🔍 检查服务连接..."
if ! curl -s "http://localhost:$PORT/health" > /dev/null 2>&1; then
    echo -e "${RED}❌ 无法连接到 dev-log 服务 (http://localhost:$PORT)${NC}"
    exit 1
fi
echo -e "${GREEN}✅ 服务连接正常${NC}"
echo ""

# 运行参数
LANGUAGES="javascript typescript python go rust java cpp csharp php ruby kotlin swift dart"

# 如果有参数，只运行指定语言
if [ "$1" != "" ]; then
    LANGUAGES="$@"
fi

# 运行测试
export DEV_LOG_PORT=$PORT
export HOST=localhost  # 本地测试使用 localhost，Docker 中会覆盖为 host.docker.internal

for lang in $LANGUAGES; do
    echo ""
    echo "----------------------------------------"
    echo -e "🧪 测试 ${YELLOW}$lang${NC}"
    echo "----------------------------------------"

    if docker-compose -f "$SCRIPT_DIR/docker-compose.yml" up --build --abort-on-container-exit "$lang" 2>&1 | grep -E "(✅|❌|测试)"; then
        :
    fi
done

echo ""
echo "========================================"
echo -e "${GREEN}✅ 所有测试完成${NC}"
echo "========================================"
echo ""
echo "查看日志:"
echo "  curl http://localhost:$PORT/logs"
