# Dev-log 多语言测试

使用 Docker 容器测试 dev-log 在各种编程语言中的工作情况。

## 快速开始

```bash
# 安装依赖
pnpm install

# 运行所有语言测试
pnpm test

# 运行单个语言测试
pnpm test javascript go python
```

## 工作原理

```
┌─────────────────┐     ┌─────────────────┐
│  dev-log 服务    │◄────│  Docker 容器     │
│  (自动启动)      │     │  (各语言测试)    │
│  localhost:PORT  │     │  host.docker.   │
│                 │     │  internal:PORT  │
└─────────────────┘     └─────────────────┘

## 范围

启动服务时会，脚本会自动:
1. 通过 workspace 引用 `@dimple-smile/dev-log`
2. 启动 dev-log 服务
3. 读取服务端口
4. 运行 Docker 测试

## 支持的语言

| 语言 | 服务名 | 镜像 |
|------|--------|------|
| JavaScript | javascript | node:20-alpine |
| TypeScript | typescript | node:20-alpine |
| Python | python | python:3.12-slim |
| Go | go | golang:1.22-alpine |
| PHP | php | php:8.2-cli |
| Ruby | ruby | ruby:3.3-alpine |
| Java | java | eclipse-temurin:21-jdk |
| C# | csharp | mcr.microsoft.com/dotnet/sdk:8.0 |
| C++ | cpp | gcc:13 |
| Rust | rust | rust:1.83-slim |
| Swift | swift | swift:5.9 |
| Kotlin | kotlin | eclipse-temurin:21-jdk |
| Dart | dart | dart:stable |
| R | r | rocker/r-ver:4.3 |

## 目录结构

```
examples/dev-log/
├── run-tests.mjs       # Node.js 测试脚本
├── docker-compose.yml   # Docker Compose 配置
├── package.json        # Node.js 包配置
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
│   ├── test.dart
│   └── test.R
└── README.md
```

## 注意事项

1. **首次运行**：Docker 会自动拉取所需镜像，可能需要较长时间
2. **查看日志**：`curl http://localhost:PORT/logs`
