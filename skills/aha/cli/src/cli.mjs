#!/usr/bin/env node
// @dimples/aha —— aha skill 的 CLI：check / serve / share
import { checkFile } from "./check.mjs";
import { serveCommand, DEFAULT_PORT, startDaemon, stopDaemon } from "./serve.mjs";
import { shareCommand } from "./share.mjs";
import { newCommand } from "./new.mjs";
import { readFileSync } from "node:fs";

const VERSION = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;

const HELP = `aha —— 概念图解页面的质量门 / 本地服务 / 公网分享

用法:
  aha check <file.html>      跑 11 道质量门，输出回执（非 0 退出码 = 有门未过）
  aha start [dir] [--port N] 后台守护启动（幂等：已运行则复用；日志 ~/.aha/.serve.log）
  aha stop  [dir] [--port N] 停止后台守护
  aha serve [dir] [--port N] 前台运行（调试用；默认 ~/.aha，端口 ${DEFAULT_PORT}）
  aha share [dir] [--port N] serve + cloudflared 临时隧道（trycloudflare.com，免账号）

示例:
  npx @dimples/aha check ~/.aha/rag.html
  npx @dimples/aha serve
  npx @dimples/aha share`;

/**
 * 解析命令行参数（纯函数，可测试 —— 评审 M11）
 * @param {string[]} argv
 * @returns {{ cmd: string|undefined, positionals: string[], opts: { port?: number } }}
 * @throws 用法错误（含坏端口 —— 评审 B4）
 */
export function parseArgs(argv) {
  const [cmd, ...rest] = argv;
  const opts = {};
  const positionals = [];
  for (let i = 0; i < rest.length; i++) {
    let a = rest[i];
    if (a === "--port") {
      a = `--port=${rest[++i] ?? ""}`; // 缺值统一走下面的校验报错（评审 B4）
    }
    if (a.startsWith("--port=")) {
      const raw = a.slice("--port=".length);
      const n = Number(raw);
      if (!raw || !Number.isInteger(n) || n < 0 || n > 65535) {
        throw new Error(`--port 需要一个 0-65535 的整数，收到的是：${raw || "（缺值）"}`);
      }
      opts.port = n;
    } else if (a.startsWith("--")) {
      throw new Error(`未知选项：${a}`);
    } else {
      positionals.push(a);
    }
  }
  return { cmd, positionals, opts };
}

/** 主入口（可测试）；返回 Promise 以便测试断言 */
export async function main(argv = process.argv.slice(2)) {
  let parsed;
  try {
    parsed = parseArgs(argv);
  } catch (e) {
    console.error(`aha: ${e.message}\n`);
    console.log(HELP);
    process.exit(2);
  }
  const { cmd, positionals, opts } = parsed;

  switch (cmd) {
    case "new":
      return newCommand(positionals[0], positionals[1]);
    case "check":
      if (!positionals[0]) {
        console.error("用法: aha check <file.html>");
        process.exit(2);
      }
      checkFile(positionals[0]);
      break;
    case "serve":
      return serveCommand(positionals[0], opts);
    case "start":
      return startCommand(positionals[0], opts);
    case "stop":
      return stopCommand(positionals[0], opts);
    case "share":
      return shareCommand(positionals[0], opts);
    case "--version":
    case "-v":
      console.log(VERSION);
      break;
    case "--help":
    case "-h":
    case undefined:
      console.log(HELP);
      break;
    default:
      console.error(`未知命令: ${cmd}\n`);
      console.log(HELP);
      process.exit(2);
  }
}

// 作为脚本直跑时执行；被 import 时不执行。
// 必须用 realpath 比对：npm 安装后 bin 是符号链接，argv[1] 是
// node_modules/.bin/aha —— 用 endsWith("cli.mjs") 判定会把 npx 调用变成静默 no-op（评审 BL1）
import { fileURLToPath } from "node:url";
import { realpathSync } from "node:fs";
const invokedAsScript = (() => {
  try {
    return process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
})();
if (invokedAsScript) {
  main();
}

/** aha start：幂等后台守护 + 书架回执（skill 交付时引用这两行输出） */
export async function startCommand(dirArg, opts = {}) {
  const r = await startDaemon({ dir: dirArg, port: opts.port });
  console.log(r.reused
    ? `aha serve 已在运行（pid ${r.pid}），复用`
    : `aha serve 已在后台运行（pid ${r.pid}，日志 ${r.dir}/.serve.log）`);
  console.log(`  书架 http://127.0.0.1:${r.port} · ${r.count} 篇`);
}

/** aha stop */
export async function stopCommand(dirArg, opts = {}) {
  await stopDaemon({ dir: dirArg, port: opts.port });
  console.log("aha serve 已停止");
}
