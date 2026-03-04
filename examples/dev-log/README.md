# Dev-log 多语言测试

使用 Docker 容器测试 dev-log 在各种编程语言中的工作情况。

## 快速开始

```bash
# 1. 启动 dev-log 服务
cd ../../skills/dev-log && node dist/index.cjs

# 2. 运行所有语言测试（一键执行）
cd ../../examples/dev-log && ./run-tests.sh

# 3. 运行单个语言测试
./run-tests.sh python
./run-tests.sh javascript go rust
```

## 工作原理

```
┌─────────────────┐     ┌─────────────────┐
│  dev-log 服务    │◄────│  Docker 容器     │
│  (宿主机运行)    │     │  (各语言测试)    │
│  localhost:PORT │     │  host.docker.   │
│                 │     │  internal:PORT  │
└─────────────────┘     └─────────────────┘
```

1. `run-tests.sh` 读取 `port.txt` 获取服务端口
2. 通过环境变量 `DEV_LOG_PORT` 传递给 Docker 容器
3. 容器通过 `host.docker.internal` 访问宿主机服务

## 支持的语言

| 语言 | 服务名 | 镜像 |
|------|--------|------|
| JavaScript | javascript | node:20-alpine |
| TypeScript | typescript | node:20-alpine |
| Python | python | python:3.12-slim |
| Go | go | golang:1.22-alpine |
| Rust | rust | rust:1.75-slim |
| Java | java | eclipse-temurin:21-jdk |
| C++ | cpp | gcc:13 |
| C# | csharp | mcr.microsoft.com/dotnet/sdk:8.0 |
| PHP | php | php:8.2-cli |
| Ruby | ruby | ruby:3.3-alpine |
| Kotlin | kotlin | zenika/kotlin:jdk21 |
| Swift | swift | swift:5.9 |
| Dart | dart | dart:stable |

## 目录结构

```
examples/dev-log/
├── run-tests.sh         # 一键测试脚本
├── docker-compose.yml   # Docker Compose 配置
├── src/             # 各语言测试脚本
│   ├── test.js
│   ├── test.ts
│   ├── test.py
│   ├── test.go
│   ├── test.rs
│   ├── Test.java
│   ├── test.cpp
│   ├── Test.cs
│   ├── test.php
│   ├── test.rb
│   ├── Test.kt
│   ├── test.swift
│   └── test.dart
└── README.md
```

## 注意事项

1. **首次运行**：Docker 会自动拉取所需镜像，可能需要较长时间
2. **Linux 用户**：`host.docker.internal` 已通过 `extra_hosts` 配置支持
3. **查看日志**：`curl http://localhost:PORT/logs`
