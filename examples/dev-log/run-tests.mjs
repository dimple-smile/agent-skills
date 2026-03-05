#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { existsSync, readFileSync, unlinkSync } from 'node:fs'
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

  // 首先等待端口文件被删除（服务启动时会先删除旧文件）
  while (existsSync(portFile) && Date.now() - startTime < timeout) {
    await sleep(100)
  }

  // 然后等待新的端口文件生成
  while (Date.now() - startTime < timeout) {
    if (existsSync(portFile)) {
      const content = readFileSync(portFile, 'utf-8').trim()
      const port = parseInt(content, 10)
      if (port && !isNaN(port) && port > 0) {
        return port
      }
    }
    await sleep(100)
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

  const portFile = join(__dirname, 'port.txt')
  const pidFile = join(__dirname, 'pid.txt')

  // 清理旧的端口和 PID 文件，让服务从头启动
  if (existsSync(portFile)) {
    const oldPid = existsSync(pidFile) ? readFileSync(pidFile, 'utf-8').trim() : null
    if (oldPid) {
      try {
        process.kill(parseInt(oldPid), 'SIGTERM')
        log('yellow', `停止旧服务 (PID: ${oldPid})`)
        await sleep(1000) // 等待旧服务完全停止
      } catch {
        // 旧进程可能不存在，忽略
      }
    }
    // 删除旧文件，让服务生成新的
    existsSync(portFile) && unlinkSync(portFile)
    existsSync(pidFile) && unlinkSync(pidFile)
  }

  // 在后台启动服务 (使用 CJS 版本)
  const serverProcess = spawn('node', [join(__dirname, '../../skills/dev-log/dist/index.cjs')], {
    cwd: __dirname,
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

  // 等待端口文件生成
  const port = await waitForPortFile(portFile)

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
