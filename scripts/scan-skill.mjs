#!/usr/bin/env node
/**
 * Skill Security Scanner - AI Agent Skills 安全检测工具
 *
 * 检测类别:
 * 1. COMMAND_EXECUTION - 命令执行风险
 * 2. DATA_EXFILTRATION - 数据泄露风险
 * 3. PROMPT_INJECTION - 提示注入风险
 * 4. SUPPLY_CHAIN - 供应链风险
 * 5. CREDENTIAL_LEAK - 凭证泄露风险
 * 6. DATA_HANDLING - 敏感数据处理风险 (W007)
 *
 * 用法:
 *   扫描单个 skill:
 *     node scan-skill.mjs /path/to/skill/
 *
 *   扫描所有 skills (自动检测 skills 目录):
 *     node scan-skill.mjs --all
 *     node scan-skill.mjs --all --json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI 颜色
const colors = {
  red: '\x1b[91m',
  yellow: '\x1b[93m',
  green: '\x1b[92m',
  blue: '\x1b[94m',
  cyan: '\x1b[96m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  reset: '\x1b[0m',
};

// ============================================
// 检测规则定义
// ============================================

const RULES = [
  // === COMMAND_EXECUTION ===
  {
    id: 'CMD-001',
    category: 'COMMAND_EXECUTION',
    severity: 'CRITICAL',
    patterns: [
      /curl\s+[^|]*\|\s*(bash|sh|zsh)/i,
      /wget\s+[^|]*\|\s*(bash|sh|zsh)/i,
    ],
    exclude: [],
    message: '远程代码执行：从网络下载并执行脚本',
    fix: '避免从不可信源下载并执行脚本，使用本地文件或验证来源',
  },
  {
    id: 'CMD-002',
    category: 'COMMAND_EXECUTION',
    severity: 'HIGH',
    patterns: [
      /\beval\s*\(/,
      /new\s+Function\s*\(/,
      /\bexec\s*\(/,
      /execSync\s*\(/,
      /child_process\.(exec|spawn)/,
      /subprocess\.(run|call|Popen)/,
    ],
    exclude: [/#\s*exec/, /execut/],
    message: '动态代码执行：可能执行任意代码',
    fix: '避免使用 eval/exec 等动态执行，使用安全的替代方案',
  },
  {
    id: 'CMD-003',
    category: 'COMMAND_EXECUTION',
    severity: 'HIGH',
    patterns: [
      /rm\s+-rf\s+\//,
      /rm\s+-rf\s+~/,
      /sudo\s+rm/i,
    ],
    exclude: [],
    message: '破坏性文件操作：可能删除重要文件',
    fix: '避免使用破坏性文件操作，添加用户确认',
  },
  {
    id: 'CMD-004',
    category: 'COMMAND_EXECUTION',
    severity: 'MEDIUM',
    patterns: [
      /sudo\s+/,
      /chmod\s+777/,
      /chmod\s+\+x/,
      /\bdoas\s+/,
    ],
    exclude: [],
    message: '权限提升：请求高权限操作',
    fix: '仅在必要时请求权限，说明权限用途',
  },

  // === DATA_EXFILTRATION ===
  {
    id: 'EXFIL-001',
    category: 'DATA_EXFILTRATION',
    severity: 'HIGH',
    patterns: [
      /fetch\s*\(\s*['"`]https?:\/\/(?!(localhost|127\.0\.0\.1|example\.com|test\.com|[^'"`]*loca\.lt|[^'"`]*ngrok|[^'"`]*tunnel|local\.))/i,
      /axios\.(get|post|put|delete)\s*\(\s*['"`]https?:\/\/(?!localhost)/i,
      /requests\.(get|post|put|delete)\s*\(\s*['"`]https?:\/\/(?!localhost)/i,
    ],
    exclude: [/example\.com/, /test\.com/, /placeholder/, /your-/i],
    message: '外部网络请求：数据可能发送到外部服务器',
    fix: '确保所有外部请求都有明确用途，并在文档中说明',
  },
  {
    id: 'EXFIL-002',
    category: 'DATA_EXFILTRATION',
    severity: 'CRITICAL',
    patterns: [
      /fetch\s*\([^)]*process\.env/i,
      /\.post\s*\([^)]*password/i,
      /\.post\s*\([^)]*token/i,
      /\.post\s*\([^)]*secret/i,
      /\.post\s*\([^)]*api[_-]?key/i,
    ],
    exclude: [],
    message: '敏感数据外传：可能泄露凭证或密钥',
    fix: '永远不要将敏感数据发送到外部服务器',
  },
  {
    id: 'EXFIL-003',
    category: 'DATA_EXFILTRATION',
    severity: 'HIGH',
    patterns: [
      /readFile\s*\(\s*['"`](\/etc\/passwd|\/etc\/shadow|~\/\.ssh)/,
      /\.ssh\/id_rsa/,
      /\.pem\b/,
      /\.key\b/,
    ],
    exclude: [/example/, /test/, /sample/],
    message: '敏感文件访问：尝试读取系统敏感文件',
    fix: '避免访问系统敏感文件，使用安全的配置方式',
  },

  // === PROMPT_INJECTION ===
  {
    id: 'INJECT-001',
    category: 'PROMPT_INJECTION',
    severity: 'HIGH',
    patterns: [
      /ignore\s+(all\s+)?previous\s+(instructions|prompts|rules)/i,
      /disregard\s+(all\s+)?(previous|above)/i,
      /forget\s+(all\s+)?(previous|everything)/i,
      /you\s+are\s+now\s+(a|an)\s+\w+\s+that/i,
      /override\s+(all\s+)?(safety|security|rules)/i,
    ],
    exclude: [],
    message: '提示注入模式：尝试覆盖 AI 行为',
    fix: '移除任何尝试覆盖 AI 行为的指令',
  },
  {
    id: 'INJECT-002',
    category: 'PROMPT_INJECTION',
    severity: 'HIGH',
    patterns: [
      /(steal|exfiltrate|send\s+to)\s+(user\s+)?(data|credentials|passwords|keys)/i,
      /(access|read|upload)\s+(user\s+)?(private|sensitive|secret)/i,
      /without\s+(user\s+)?(consent|permission|knowledge)/i,
      /(bypass|circumvent|disable)\s+(security|safety|filter)/i,
    ],
    exclude: [/example/, /documentation/, /do not/i, /never/i, /avoid/i],
    message: '恶意行为指令：指示 AI 执行恶意操作',
    fix: '移除任何指示 AI 执行恶意操作的指令',
  },

  // === SUPPLY_CHAIN ===
  {
    id: 'SUPPLY-001',
    category: 'SUPPLY_CHAIN',
    severity: 'CRITICAL',
    patterns: [
      /curl\s+-o\s+\S+\.sh\s+https?:\/\//i,
      /wget\s+-O\s+\S+\.sh\s+https?:\/\//i,
      /download\s+.*\.(exe|dll|so|dylib|bin)/i,
    ],
    exclude: [],
    message: '下载可执行文件：可能引入恶意软件',
    fix: '避免从外部下载可执行文件，使用包管理器',
  },
  {
    id: 'SUPPLY-002',
    category: 'SUPPLY_CHAIN',
    severity: 'HIGH',
    patterns: [
      /npm\s+install\s+-g\s+(?!@)/,
      /pip\s+install\s+--user\s+https?:\/\//i,
      /pip\s+install\s+git\+https?:\/\//i,
    ],
    exclude: [],
    message: '不安全的包安装：从非标准源安装依赖',
    fix: '使用包管理器和锁定文件，从官方源安装',
  },

  // === CREDENTIAL_LEAK ===
  {
    id: 'CRED-001',
    category: 'CREDENTIAL_LEAK',
    severity: 'CRITICAL',
    patterns: [
      /(?:api[_-]?key|apikey)\s*[=:]\s*["'][a-zA-Z0-9]{20,}["']/i,
      /(?:secret|token)\s*[=:]\s*["'][a-zA-Z0-9]{20,}["']/i,
      /(?:password|passwd)\s*[=:]\s*["'][^"']{8,}["']/i,
      /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/,
      /aws_access_key_id\s*=\s*[A-Z0-9]{20}/,
    ],
    exclude: [/your[_-]/i, /YOUR[_-]/, /<[_-]/, /xxx/, /placeholder/, /example/],
    message: '凭证泄露：发现硬编码的敏感信息',
    fix: '使用环境变量或配置文件存储敏感信息',
  },
  {
    id: 'CRED-002',
    category: 'CREDENTIAL_LEAK',
    severity: 'HIGH',
    patterns: [
      /process\.env\.[A-Z_]+/,
      /os\.environ(?:get)?\s*\(\s*["'][A-Z_]+["']/,
      /getenv\s*\(\s*["'][A-Z_]+["']/,
    ],
    exclude: [],
    message: '环境变量访问：可能访问敏感配置',
    fix: '确保环境变量访问有明确用途并文档说明',
  },

  // === DATA_HANDLING ===
  {
    id: 'DATA-001',
    category: 'DATA_HANDLING',
    severity: 'HIGH',
    patterns: [
      // 检测记录表单字段值但没有过滤敏感字段的模式
      /fetch\s*\([^)]*body[^)]*(password|passwd|pwd|token|secret|api_key|apikey)\s*[,}]/i,
      // 直接记录用户输入值
      /\.post\s*\([^)]*data\s*:\s*\{[^}]*(value|input|form)/i,
    ],
    // 排除包含敏感数据过滤警告的文件
    exclude: [/sanitize/i, /sensitive/i, /敏感/i, /\*\*\*/, /REDACTED/i, /过滤/i],
    message: '不安全的凭证处理：可能记录敏感信息',
    fix: '添加敏感数据过滤机制，禁止记录密码、token 等敏感字段',
  },
  {
    id: 'DATA-002',
    category: 'DATA_HANDLING',
    severity: 'MEDIUM',
    patterns: [
      // 记录表单字段
      /form\.[a-z]+\.value/i,
      /input\.value/i,
      /e\.target\.value/i,
    ],
    // 排除包含警告的文件
    exclude: [/sanitize/i, /敏感/i, /sensitive/i, /warning/i, /警告/i, /\*\*\*/],
    message: '用户输入记录：可能记录敏感数据，建议添加过滤机制',
    fix: '添加 sanitize 函数过滤敏感字段，或明确警告禁止记录敏感信息',
  },
];

// 文件扩展名过滤
const SCAN_EXTENSIONS = new Set([
  '.md', '.txt',
  '.py', '.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs',
  '.sh', '.bash', '.zsh',
  '.json', '.yaml', '.yml',
  '.go', '.rs', '.java', '.kt',
  '.php', '.rb', '.lua',
]);

// 排除目录
const EXCLUDE_DIRS = new Set([
  'node_modules', '.git', '__pycache__', 'venv', '.venv',
  'dist', 'build', '.cache', 'vendor',
]);

/**
 * 递归获取所有文件
 */
function getAllFiles(dirPath, files = []) {
  if (!fs.existsSync(dirPath)) return files;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (!EXCLUDE_DIRS.has(entry.name)) {
        getAllFiles(fullPath, files);
      }
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      const isSkillMd = entry.name.toUpperCase() === 'SKILL.MD';
      if (SCAN_EXTENSIONS.has(ext) || isSkillMd) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

/**
 * 扫描单个文件
 */
function scanFile(filePath, skillPath) {
  const findings = [];
  const content = fs.readFileSync(filePath, 'utf-8');

  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags + 'g');

      while ((match = regex.exec(content)) !== null) {
        // 检查排除模式（同时检查匹配字符串和整个文件内容）
        let shouldExclude = false;
        for (const excludePattern of rule.exclude) {
          // 先检查匹配字符串
          if (excludePattern.test(match[0])) {
            shouldExclude = true;
            break;
          }
          // 对于文件级别的排除（如敏感数据警告），检查整个文件
          if (excludePattern.test(content)) {
            shouldExclude = true;
            break;
          }
        }

        if (shouldExclude) continue;

        // 计算行号
        const lineNum = content.substring(0, match.index).split('\n').length;

        // 获取证据
        let evidence = match[0];
        if (evidence.length > 100) {
          evidence = evidence.substring(0, 100) + '...';
        }

        findings.push({
          rule_id: rule.id,
          category: rule.category,
          severity: rule.severity,
          file: path.relative(skillPath, filePath),
          line: lineNum,
          message: rule.message,
          evidence,
          fix: rule.fix,
        });
      }
    }
  }

  return findings;
}

/**
 * 扫描单个 skill
 */
function scanSkill(skillPath) {
  const startTime = Date.now();
  const files = getAllFiles(skillPath);
  let allFindings = [];

  for (const file of files) {
    const findings = scanFile(file, skillPath);
    allFindings = allFindings.concat(findings);
  }

  const durationMs = Date.now() - startTime;

  return {
    skill_name: path.basename(skillPath),
    skill_path: skillPath,
    files_scanned: files.length,
    findings: allFindings,
    duration_ms: durationMs,
    risk_level: getRiskLevel(allFindings),
  };
}

/**
 * 计算风险级别
 */
function getRiskLevel(findings) {
  if (findings.some(f => f.severity === 'CRITICAL')) return 'CRITICAL';
  if (findings.some(f => f.severity === 'HIGH')) return 'HIGH';
  if (findings.some(f => f.severity === 'MEDIUM')) return 'MEDIUM';
  if (findings.length > 0) return 'LOW';
  return 'CLEAN';
}

/**
 * 查找 skills 目录
 */
function findSkillsDir(startPath) {
  let current = startPath;

  // 向上查找，直到找到 skills 目录
  while (current !== '/') {
    const skillsPath = path.join(current, 'skills');
    if (fs.existsSync(skillsPath) && fs.statSync(skillsPath).isDirectory()) {
      return skillsPath;
    }
    current = path.dirname(current);
  }

  return null;
}

/**
 * 获取所有 skills
 */
function getAllSkills(skillsDir) {
  const skills = [];

  if (!fs.existsSync(skillsDir)) return skills;

  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory() && !entry.name.startsWith('.')) {
      const skillPath = path.join(skillsDir, entry.name);
      const skillMdPath = path.join(skillPath, 'SKILL.md');

      // 只包含有 SKILL.md 的目录
      if (fs.existsSync(skillMdPath)) {
        skills.push(skillPath);
      }
    }
  }

  return skills;
}

/**
 * 打印单个 skill 报告
 */
function printSkillReport(result, verbose = false, compact = false) {
  const riskColors = {
    CRITICAL: colors.red,
    HIGH: colors.yellow,
    MEDIUM: colors.yellow,
    LOW: colors.blue,
    INFO: colors.reset,
    CLEAN: colors.green,
  };

  const riskColor = riskColors[result.risk_level] || colors.reset;
  const icons = { CRITICAL: '🔴', HIGH: '🟠', MEDIUM: '🟡', LOW: '🔵', CLEAN: '✅' };

  if (compact) {
    // 紧凑模式：单行输出
    const icon = icons[result.risk_level] || '❓';
    const findingCount = result.findings.length;
    console.log(`  ${icon} ${result.skill_name.padEnd(25)} ${riskColor}${result.risk_level.padEnd(10)}${colors.reset} ${colors.dim}(${result.files_scanned} files, ${findingCount} issues)${colors.reset}`);
    return;
  }

  console.log(`\n${colors.bold}${'═'.repeat(60)}${colors.reset}`);
  console.log(`${colors.bold}  SKILL: ${result.skill_name}${colors.reset}`);
  console.log(`${colors.bold}${'═'.repeat(60)}${colors.reset}\n`);

  console.log(`  Files:        ${result.files_scanned}`);
  console.log(`  Duration:     ${result.duration_ms}ms`);
  console.log(`  Risk Level:   ${riskColor}${colors.bold}${result.risk_level}${colors.reset}\n`);

  // 统计
  const severities = {};
  for (const f of result.findings) {
    severities[f.severity] = (severities[f.severity] || 0) + 1;
  }

  if (result.findings.length > 0) {
    console.log(`  Findings: ${result.findings.length}`);
    const sevIcons = { CRITICAL: '🔴', HIGH: '🟠', MEDIUM: '🟡', LOW: '🔵', INFO: 'ℹ️' };
    for (const sev of ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']) {
      if (severities[sev]) {
        const sevColor = riskColors[sev];
        console.log(`    ${sevIcons[sev] || '•'} ${sevColor}${sev}: ${severities[sev]}${colors.reset}`);
      }
    }
  } else {
    console.log(`  ${colors.green}✅ No security issues found${colors.reset}`);
  }

  // 详细发现
  if (verbose && result.findings.length > 0) {
    console.log(`\n${colors.bold}${'─'.repeat(60)}${colors.reset}`);

    const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
    const sorted = [...result.findings].sort(
      (a, b) => (severityOrder[a.severity] || 5) - (severityOrder[b.severity] || 5)
    );

    for (const f of sorted) {
      const sevColor = riskColors[f.severity] || colors.reset;
      console.log(`\n  ${sevColor}${colors.bold}[${f.rule_id}] ${f.message}${colors.reset}`);
      console.log(`     File:     ${f.file}:${f.line}`);
      console.log(`     Evidence: ${colors.dim}${f.evidence}${colors.reset}`);
    }
  }

  console.log(`\n${colors.bold}${'─'.repeat(60)}${colors.reset}`);
}

/**
 * 打印汇总报告
 */
function printSummaryReport(results, totalTime) {
  const riskColors = {
    CRITICAL: colors.red,
    HIGH: colors.yellow,
    MEDIUM: colors.yellow,
    LOW: colors.blue,
    CLEAN: colors.green,
  };

  console.log(`\n${colors.bold}${colors.cyan}${'═'.repeat(60)}${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}  SECURITY SCAN SUMMARY${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}${'═'.repeat(60)}${colors.reset}\n`);

  // 统计
  const byRisk = {};
  for (const r of results) {
    byRisk[r.risk_level] = (byRisk[r.risk_level] || 0) + 1;
  }

  console.log(`  Total Skills:   ${results.length}`);
  console.log(`  Total Time:     ${totalTime}ms\n`);

  console.log(`  Risk Distribution:`);
  const riskOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'CLEAN'];
  const icons = { CRITICAL: '🔴', HIGH: '🟠', MEDIUM: '🟡', LOW: '🔵', CLEAN: '✅' };

  for (const risk of riskOrder) {
    if (byRisk[risk]) {
      const color = riskColors[risk];
      console.log(`    ${icons[risk]} ${color}${risk}: ${byRisk[risk]}${colors.reset}`);
    }
  }

  // 高风险 skills 列表
  const highRisk = results.filter(r => ['CRITICAL', 'HIGH'].includes(r.risk_level));
  if (highRisk.length > 0) {
    console.log(`\n  ${colors.red}${colors.bold}⚠️  High Risk Skills:${colors.reset}`);
    for (const r of highRisk) {
      const color = riskColors[r.risk_level];
      console.log(`    ${color}• ${r.skill_name} (${r.risk_level})${colors.reset}`);
    }
  }

  console.log(`\n${colors.bold}${colors.cyan}${'═'.repeat(60)}${colors.reset}`);

  // 返回退出码
  if (byRisk['CRITICAL'] > 0) return 2;
  if (byRisk['HIGH'] > 0) return 1;
  return 0;
}

/**
 * 打印帮助
 */
function printHelp() {
  console.log(`
${colors.bold}Skill Security Scanner${colors.reset} - AI Agent Skills 安全检测工具

${colors.bold}用法:${colors.reset}
  扫描单个 skill:
    node scan-skill.mjs <skill-path> [options]

  扫描所有 skills:
    node scan-skill.mjs --all [options]

${colors.bold}选项:${colors.reset}
  -a, --all        扫描 skills 目录下的所有 skills
  -v, --verbose    显示详细发现
  -c, --compact    紧凑模式（批量扫描时单行显示每个 skill）
  -j, --json       JSON 格式输出
  --ci             CI 模式（高风险时返回非零退出码）
  -h, --help       显示帮助

${colors.bold}示例:${colors.reset}
  node scan-skill.mjs ./skills/dev-log/
  node scan-skill.mjs ./skills/dev-log/ --verbose
  node scan-skill.mjs --all
  node scan-skill.mjs --all --compact
  node scan-skill.mjs --all --json --ci
`);
}

/**
 * 主函数
 */
function main() {
  const args = process.argv.slice(2);

  // 帮助
  if (args.includes('-h') || args.includes('--help')) {
    printHelp();
    process.exit(0);
  }

  const verbose = args.includes('-v') || args.includes('--verbose');
  const compact = args.includes('-c') || args.includes('--compact');
  const jsonOutput = args.includes('-j') || args.includes('--json');
  const ciMode = args.includes('--ci');
  const scanAll = args.includes('-a') || args.includes('--all');

  // 批量扫描所有 skills
  if (scanAll) {
    const skillsDir = findSkillsDir(process.cwd()) || path.join(process.cwd(), 'skills');

    if (!fs.existsSync(skillsDir)) {
      console.log(`${colors.red}Error: skills directory not found${colors.reset}`);
      process.exit(1);
    }

    const skills = getAllSkills(skillsDir);

    if (skills.length === 0) {
      console.log(`${colors.yellow}No skills found in ${skillsDir}${colors.reset}`);
      process.exit(0);
    }

    console.log(`\n${colors.bold}${colors.cyan}Scanning ${skills.length} skills...${colors.reset}\n`);

    const startTime = Date.now();
    const results = [];

    for (const skillPath of skills) {
      const result = scanSkill(skillPath);
      results.push(result);

      if (!jsonOutput) {
        printSkillReport(result, verbose, !verbose);
      }
    }

    const totalTime = Date.now() - startTime;

    if (jsonOutput) {
      const output = {
        scanned_at: new Date().toISOString(),
        total_skills: results.length,
        total_time_ms: totalTime,
        skills: results,
      };
      console.log(JSON.stringify(output, null, 2));
    } else {
      const exitCode = printSummaryReport(results, totalTime);
      process.exit(ciMode ? exitCode : 0);
    }

    return;
  }

  // 扫描单个 skill
  const skillPath = args.find(a => !a.startsWith('-'));

  if (!skillPath) {
    printHelp();
    process.exit(1);
  }

  const resolvedPath = path.resolve(skillPath);

  if (!fs.existsSync(resolvedPath)) {
    console.log(`${colors.red}Error: Path not found: ${resolvedPath}${colors.reset}`);
    process.exit(1);
  }

  const result = scanSkill(resolvedPath);

  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
    const exitCode = ciMode && ['CRITICAL', 'HIGH'].includes(result.risk_level) ? 1 : 0;
    process.exit(exitCode);
  } else {
    printSkillReport(result, verbose, false);

    // 结论
    if (['CRITICAL', 'HIGH'].includes(result.risk_level)) {
      console.log(`\n${colors.red}${colors.bold}⚠️  ${result.risk_level} RISK — Do not install without thorough review.${colors.reset}\n`);
      process.exit(ciMode ? 1 : 0);
    } else if (result.risk_level === 'MEDIUM') {
      console.log(`\n${colors.yellow}${colors.bold}⚡ MEDIUM RISK — Review recommended before use.${colors.reset}\n`);
      process.exit(0);
    } else {
      console.log(`\n${colors.green}${colors.bold}✅ LOW RISK — Safe to use.${colors.reset}\n`);
      process.exit(0);
    }
  }
}

main();
