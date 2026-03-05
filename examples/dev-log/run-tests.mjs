#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
// dev-log 服务通过子进程启动，不直接 import

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const LANGUAGES = [
  'javascript', 'typescript', 'python', 'go', 'php', 'ruby',
  'java', 'cpp', 'csharp', 'rust', 'swift', 'kotlin', 'dart', 'r'
]

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
}

function log(color, text) {
  console.log(`${colors[color]}${text}${colors.reset}`)
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function waitForPortFile(portFile, timeout = 15000) {
  const startTime = Date.now()

  // 记录初始端口（如果存在）
  const initialPort = existsSync(portFile)
    ? parseInt(readFileSync(portFile, 'utf-8').trim(), 10)
    : null

  // 等待端口文件生成或变化
  while (Date.now() - startTime < timeout) {
    if (existsSync(portFile)) {
      const content = readFileSync(portFile, 'utf-8').trim()
      const port = parseInt(content, 10)
      if (port && !isNaN(port) && port > 0) {
        // 如果端口变化了，或者是新生成的，返回新端口
        if (port !== initialPort) {
          return port
        }
      }
    }
    await sleep(100)
  }

  // 超时后，如果文件存在且有效，仍然返回
  if (existsSync(portFile)) {
    const port = parseInt(readFileSync(portFile, 'utf-8').trim(), 10)
    if (port && !isNaN(port) && port > 0) {
      return port
    }
  }

  return null
}

async function runDockerTest(lang, port) {
  return new Promise((resolve) => {
    const child = spawn('docker', ['compose', '-f', 'docker-compose.yml', 'up', '--build', '--abort-on-container-exit', lang], {
      cwd: __dirname,
      env: { ...process.env, DEV_LOG_PORT: String(port), HOST: 'host.docker.internal' },
      stdio: 'inherit'
    })

    child.on('close', (code) => {
      resolve({ lang, code: code ?? 1 })
    })

    child.on('error', (err) => {
      log('red', `❌ ${lang} 启动失败: ${err.message}`)
      resolve({ lang, code: 1 })
    })
  })
}

async function main() {
  console.log('\n========================================')
  console.log('  Dev-log 多语言测试')
  console.log('========================================\n')

  // 启动 dev-log 服务
  log('blue', '启动 dev-log 服务...\n')

  // 在后台启动服务 (使用 CJS 版本，cwd 设置为 dist 目录)
  const distDir = join(__dirname, '../../skills/dev-log/dist')
  const serverProcess = spawn('node', ['index.cjs'], {
    cwd: distDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true
  })

  // 输出服务日志
  serverProcess.stdout?.on('data', (data) => {
    process.stdout.write(data)
  })
  serverProcess.stderr?.on('data', (data) => {
    process.stderr.write(data)
  })

  // 等待端口文件生成 (文件会在 dist 目录下)
  const port = await waitForPortFile(join(distDir, 'port.txt'))

  if (!port) {
    log('red', '❌ 服务启动超时：未能获取端口号')
    serverProcess.kill()
    process.exit(1)
  }

  log('green', `✅ 服务已启动，端口: ${port}\n`)

  // 运行所有语言测试
  const results = []

  for (const lang of LANGUAGES) {
    process.stdout.write(`\n测试 ${lang}...\n`)
    const result = await runDockerTest(lang, port)
    results.push(result)

    if (result.code === 0) {
      log('green', `✅ ${lang} 测试通过`)
    } else {
      log('red', `❌ ${lang} 测试失败 (exit code: ${result.code})`)
    }
  }

  // 停止服务
  serverProcess.kill()

  // 输出报告
  console.log('\n========================================')
  console.log('  测试结果汇总')
  console.log('========================================\n')

  const passed = results.filter(r => r.code === 0)
  const failed = results.filter(r => r.code !== 0)

  console.log(`通过: ${passed.length}/${LANGUAGES.length}`)
  console.log(`失败: ${failed.length}/${LANGUAGES.length}\n`)

  if (failed.length > 0) {
    log('red', '\n失败的测试:')
    for (const f of failed) {
      console.log(`  - ${f.lang} (exit code: ${f.code})`)
    }
    process.exit(1)
  }

  log('green', '\n✅ 所有测试通过！')
  console.log(`\n查看日志: curl http://localhost:${port}/logs`)
}

main().catch((error) => {
  log('red', `错误: ${error.message}`)
  process.exit(1)
})
