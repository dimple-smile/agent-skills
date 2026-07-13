#!/usr/bin/env node
'use strict';

var http = require('http');
var child_process = require('child_process');
var require$$0$2 = require('url');
var net = require('net');
var os = require('os');
var fs = require('fs');
var path = require('path');
var require$$0$3 = require('events');
var require$$2 = require('https');
var require$$3 = require('stream');
var require$$4 = require('assert');
var require$$0$1 = require('tty');
var require$$1 = require('util');
var require$$8 = require('zlib');
var require$$4$1 = require('tls');
var crypto = require('crypto');

var _documentCurrentScript = typeof document !== 'undefined' ? document.currentScript : null;
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
function toArr(any) {
  return any == null ? [] : Array.isArray(any) ? any : [any];
}
function toVal(out, key, val, opts) {
  var x, old = out[key], nxt = !!~opts.string.indexOf(key) ? val == null || val === true ? "" : String(val) : typeof val === "boolean" ? val : !!~opts.boolean.indexOf(key) ? val === "false" ? false : val === "true" || (out._.push((x = +val, x * 0 === 0) ? x : val), !!val) : (x = +val, x * 0 === 0) ? x : val;
  out[key] = old == null ? nxt : Array.isArray(old) ? old.concat(nxt) : [old, nxt];
}
function lib_default(args, opts) {
  args = args || [];
  opts = opts || {};
  var k, arr, arg, name, val, out = { _: [] };
  var i = 0, j = 0, idx = 0, len = args.length;
  const alibi = opts.alias !== void 0;
  const strict = opts.unknown !== void 0;
  const defaults = opts.default !== void 0;
  opts.alias = opts.alias || {};
  opts.string = toArr(opts.string);
  opts.boolean = toArr(opts.boolean);
  if (alibi) for (k in opts.alias) {
    arr = opts.alias[k] = toArr(opts.alias[k]);
    for (i = 0; i < arr.length; i++) (opts.alias[arr[i]] = arr.concat(k)).splice(i, 1);
  }
  for (i = opts.boolean.length; i-- > 0; ) {
    arr = opts.alias[opts.boolean[i]] || [];
    for (j = arr.length; j-- > 0; ) opts.boolean.push(arr[j]);
  }
  for (i = opts.string.length; i-- > 0; ) {
    arr = opts.alias[opts.string[i]] || [];
    for (j = arr.length; j-- > 0; ) opts.string.push(arr[j]);
  }
  if (defaults) for (k in opts.default) {
    name = typeof opts.default[k];
    arr = opts.alias[k] = opts.alias[k] || [];
    if (opts[name] !== void 0) {
      opts[name].push(k);
      for (i = 0; i < arr.length; i++) opts[name].push(arr[i]);
    }
  }
  const keys = strict ? Object.keys(opts.alias) : [];
  for (i = 0; i < len; i++) {
    arg = args[i];
    if (arg === "--") {
      out._ = out._.concat(args.slice(++i));
      break;
    }
    for (j = 0; j < arg.length; j++) if (arg.charCodeAt(j) !== 45) break;
    if (j === 0) out._.push(arg);
    else if (arg.substring(j, j + 3) === "no-") {
      name = arg.substring(j + 3);
      if (strict && !~keys.indexOf(name)) return opts.unknown(arg);
      out[name] = false;
    } else {
      for (idx = j + 1; idx < arg.length; idx++) if (arg.charCodeAt(idx) === 61) break;
      name = arg.substring(j, idx);
      val = arg.substring(++idx) || i + 1 === len || ("" + args[i + 1]).charCodeAt(0) === 45 || args[++i];
      arr = j === 2 ? [name] : name;
      for (idx = 0; idx < arr.length; idx++) {
        name = arr[idx];
        if (strict && !~keys.indexOf(name)) return opts.unknown("-".repeat(j) + name);
        toVal(out, name, idx + 1 < arr.length || val, opts);
      }
    }
  }
  if (defaults) {
    for (k in opts.default) if (out[k] === void 0) out[k] = opts.default[k];
  }
  if (alibi) for (k in out) {
    arr = opts.alias[k] || [];
    while (arr.length > 0) out[arr.shift()] = out[k];
  }
  return out;
}
function removeBrackets(v) {
  return v.replace(/[<[].+/, "").trim();
}
function findAllBrackets(v) {
  const ANGLED_BRACKET_RE_GLOBAL = /<([^>]+)>/g;
  const SQUARE_BRACKET_RE_GLOBAL = /\[([^\]]+)\]/g;
  const res = [];
  const parse = (match) => {
    let variadic = false;
    let value = match[1];
    if (value.startsWith("...")) {
      value = value.slice(3);
      variadic = true;
    }
    return {
      required: match[0].startsWith("<"),
      value,
      variadic
    };
  };
  let angledMatch;
  while (angledMatch = ANGLED_BRACKET_RE_GLOBAL.exec(v)) res.push(parse(angledMatch));
  let squareMatch;
  while (squareMatch = SQUARE_BRACKET_RE_GLOBAL.exec(v)) res.push(parse(squareMatch));
  return res;
}
function getMriOptions(options) {
  const result = {
    alias: {},
    boolean: []
  };
  for (const [index, option] of options.entries()) {
    if (option.names.length > 1) result.alias[option.names[0]] = option.names.slice(1);
    if (option.isBoolean) if (option.negated) {
      if (!options.some((o, i) => {
        return i !== index && o.names.some((name) => option.names.includes(name)) && typeof o.required === "boolean";
      })) result.boolean.push(option.names[0]);
    } else result.boolean.push(option.names[0]);
  }
  return result;
}
function findLongest(arr) {
  return arr.sort((a, b) => {
    return a.length > b.length ? -1 : 1;
  })[0];
}
function padRight(str, length) {
  return str.length >= length ? str : `${str}${" ".repeat(length - str.length)}`;
}
function camelcase(input) {
  return input.replaceAll(/([a-z])-([a-z])/g, (_, p1, p2) => {
    return p1 + p2.toUpperCase();
  });
}
function setDotProp(obj, keys, val) {
  let current = obj;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (i === keys.length - 1) {
      current[key] = val;
      return;
    }
    if (current[key] == null) {
      const nextKeyIsArrayIndex = +keys[i + 1] > -1;
      current[key] = nextKeyIsArrayIndex ? [] : {};
    }
    current = current[key];
  }
}
function setByType(obj, transforms) {
  for (const key of Object.keys(transforms)) {
    const transform = transforms[key];
    if (transform.shouldTransform) {
      obj[key] = [obj[key]].flat();
      if (typeof transform.transformFunction === "function") obj[key] = obj[key].map(transform.transformFunction);
    }
  }
}
function getFileName(input) {
  const m = /([^\\/]+)$/.exec(input);
  return m ? m[1] : "";
}
function camelcaseOptionName(name) {
  return name.split(".").map((v, i) => {
    return i === 0 ? camelcase(v) : v;
  }).join(".");
}
var CACError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "CACError";
    if (typeof Error.captureStackTrace !== "function") this.stack = new Error(message).stack;
  }
};
var Option = class {
  constructor(rawName, description, config) {
    __publicField(this, "rawName");
    __publicField(this, "description");
    /** Option name */
    __publicField(this, "name");
    /** Option name and aliases */
    __publicField(this, "names");
    __publicField(this, "isBoolean");
    __publicField(this, "required");
    __publicField(this, "config");
    __publicField(this, "negated");
    this.rawName = rawName;
    this.description = description;
    this.config = Object.assign({}, config);
    rawName = rawName.replaceAll(".*", "");
    this.negated = false;
    this.names = removeBrackets(rawName).split(",").map((v) => {
      let name = v.trim().replace(/^-{1,2}/, "");
      if (name.startsWith("no-")) {
        this.negated = true;
        name = name.replace(/^no-/, "");
      }
      return camelcaseOptionName(name);
    }).sort((a, b) => a.length > b.length ? 1 : -1);
    this.name = this.names.at(-1);
    if (this.negated && this.config.default == null) this.config.default = true;
    if (rawName.includes("<")) this.required = true;
    else if (rawName.includes("[")) this.required = false;
    else this.isBoolean = true;
  }
};
let runtimeProcessArgs;
let runtimeInfo;
if (typeof process !== "undefined") {
  let runtimeName;
  if (typeof Deno !== "undefined" && typeof Deno.version?.deno === "string") runtimeName = "deno";
  else if (typeof Bun !== "undefined" && typeof Bun.version === "string") runtimeName = "bun";
  else runtimeName = "node";
  runtimeInfo = `${process.platform}-${process.arch} ${runtimeName}-${process.version}`;
  runtimeProcessArgs = process.argv;
} else if (typeof navigator === "undefined") runtimeInfo = `unknown`;
else runtimeInfo = `${navigator.platform} ${navigator.userAgent}`;
var Command = class {
  constructor(rawName, description, config = {}, cli) {
    __publicField(this, "rawName");
    __publicField(this, "description");
    __publicField(this, "config");
    __publicField(this, "cli");
    __publicField(this, "options");
    __publicField(this, "aliasNames");
    __publicField(this, "name");
    __publicField(this, "args");
    __publicField(this, "commandAction");
    __publicField(this, "usageText");
    __publicField(this, "versionNumber");
    __publicField(this, "examples");
    __publicField(this, "helpCallback");
    __publicField(this, "globalCommand");
    this.rawName = rawName;
    this.description = description;
    this.config = config;
    this.cli = cli;
    this.options = [];
    this.aliasNames = [];
    this.name = removeBrackets(rawName);
    this.args = findAllBrackets(rawName);
    this.examples = [];
  }
  usage(text) {
    this.usageText = text;
    return this;
  }
  allowUnknownOptions() {
    this.config.allowUnknownOptions = true;
    return this;
  }
  ignoreOptionDefaultValue() {
    this.config.ignoreOptionDefaultValue = true;
    return this;
  }
  version(version, customFlags = "-v, --version") {
    this.versionNumber = version;
    this.option(customFlags, "Display version number");
    return this;
  }
  example(example) {
    this.examples.push(example);
    return this;
  }
  /**
  * Add a option for this command
  * @param rawName Raw option name(s)
  * @param description Option description
  * @param config Option config
  */
  option(rawName, description, config) {
    const option = new Option(rawName, description, config);
    this.options.push(option);
    return this;
  }
  alias(name) {
    this.aliasNames.push(name);
    return this;
  }
  action(callback) {
    this.commandAction = callback;
    return this;
  }
  /**
  * Check if a command name is matched by this command
  * @param name Command name
  */
  isMatched(name) {
    return this.name === name || this.aliasNames.includes(name);
  }
  get isDefaultCommand() {
    return this.name === "" || this.aliasNames.includes("!");
  }
  get isGlobalCommand() {
    return this instanceof GlobalCommand;
  }
  /**
  * Check if an option is registered in this command
  * @param name Option name
  */
  hasOption(name) {
    name = name.split(".")[0];
    return this.options.find((option) => {
      return option.names.includes(name);
    });
  }
  outputHelp() {
    const { name, commands } = this.cli;
    const { versionNumber, options: globalOptions, helpCallback } = this.cli.globalCommand;
    let sections = [{ body: `${name}${versionNumber ? `/${versionNumber}` : ""}` }];
    sections.push({
      title: "Usage",
      body: `  $ ${name} ${this.usageText || this.rawName}`
    });
    if ((this.isGlobalCommand || this.isDefaultCommand) && commands.length > 0) {
      const longestCommandName = findLongest(commands.map((command) => command.rawName));
      sections.push({
        title: "Commands",
        body: commands.map((command) => {
          return `  ${padRight(command.rawName, longestCommandName.length)}  ${command.description}`;
        }).join("\n")
      }, {
        title: `For more info, run any command with the \`--help\` flag`,
        body: commands.map((command) => `  $ ${name}${command.name === "" ? "" : ` ${command.name}`} --help`).join("\n")
      });
    }
    let options = this.isGlobalCommand ? globalOptions : [...this.options, ...globalOptions || []];
    if (!this.isGlobalCommand && !this.isDefaultCommand) options = options.filter((option) => option.name !== "version");
    if (options.length > 0) {
      const longestOptionName = findLongest(options.map((option) => option.rawName));
      sections.push({
        title: "Options",
        body: options.map((option) => {
          return `  ${padRight(option.rawName, longestOptionName.length)}  ${option.description} ${option.config.default === void 0 ? "" : `(default: ${option.config.default})`}`;
        }).join("\n")
      });
    }
    if (this.examples.length > 0) sections.push({
      title: "Examples",
      body: this.examples.map((example) => {
        if (typeof example === "function") return example(name);
        return example;
      }).join("\n")
    });
    if (helpCallback) sections = helpCallback(sections) || sections;
    console.info(sections.map((section) => {
      return section.title ? `${section.title}:
${section.body}` : section.body;
    }).join("\n\n"));
  }
  outputVersion() {
    const { name } = this.cli;
    const { versionNumber } = this.cli.globalCommand;
    if (versionNumber) console.info(`${name}/${versionNumber} ${runtimeInfo}`);
  }
  checkRequiredArgs() {
    const minimalArgsCount = this.args.filter((arg) => arg.required).length;
    if (this.cli.args.length < minimalArgsCount) throw new CACError(`missing required args for command \`${this.rawName}\``);
  }
  /**
  * Check if the parsed options contain any unknown options
  *
  * Exit and output error when true
  */
  checkUnknownOptions() {
    const { options, globalCommand } = this.cli;
    if (!this.config.allowUnknownOptions) {
      for (const name of Object.keys(options)) if (name !== "--" && !this.hasOption(name) && !globalCommand.hasOption(name)) throw new CACError(`Unknown option \`${name.length > 1 ? `--${name}` : `-${name}`}\``);
    }
  }
  /**
  * Check if the required string-type options exist
  */
  checkOptionValue() {
    const { options: parsedOptions, globalCommand } = this.cli;
    const options = [...globalCommand.options, ...this.options];
    for (const option of options) {
      const value = parsedOptions[option.name.split(".")[0]];
      if (option.required) {
        const hasNegated = options.some((o) => o.negated && o.names.includes(option.name));
        if (value === true || value === false && !hasNegated) throw new CACError(`option \`${option.rawName}\` value is missing`);
      }
    }
  }
  /**
  * Check if the number of args is more than expected
  */
  checkUnusedArgs() {
    const maximumArgsCount = this.args.some((arg) => arg.variadic) ? Infinity : this.args.length;
    if (maximumArgsCount < this.cli.args.length) throw new CACError(`Unused args: ${this.cli.args.slice(maximumArgsCount).map((arg) => `\`${arg}\``).join(", ")}`);
  }
};
var GlobalCommand = class extends Command {
  constructor(cli) {
    super("@@global@@", "", {}, cli);
  }
};
var CAC = class extends EventTarget {
  /**
  * @param name The program name to display in help and version message
  */
  constructor(name = "") {
    super();
    /** The program name to display in help and version message */
    __publicField(this, "name");
    __publicField(this, "commands");
    __publicField(this, "globalCommand");
    __publicField(this, "matchedCommand");
    __publicField(this, "matchedCommandName");
    /**
    * Raw CLI arguments
    */
    __publicField(this, "rawArgs");
    /**
    * Parsed CLI arguments
    */
    __publicField(this, "args");
    /**
    * Parsed CLI options, camelCased
    */
    __publicField(this, "options");
    __publicField(this, "showHelpOnExit");
    __publicField(this, "showVersionOnExit");
    this.name = name;
    this.commands = [];
    this.rawArgs = [];
    this.args = [];
    this.options = {};
    this.globalCommand = new GlobalCommand(this);
    this.globalCommand.usage("<command> [options]");
  }
  /**
  * Add a global usage text.
  *
  * This is not used by sub-commands.
  */
  usage(text) {
    this.globalCommand.usage(text);
    return this;
  }
  /**
  * Add a sub-command
  */
  command(rawName, description, config) {
    const command = new Command(rawName, description || "", config, this);
    command.globalCommand = this.globalCommand;
    this.commands.push(command);
    return command;
  }
  /**
  * Add a global CLI option.
  *
  * Which is also applied to sub-commands.
  */
  option(rawName, description, config) {
    this.globalCommand.option(rawName, description, config);
    return this;
  }
  /**
  * Show help message when `-h, --help` flags appear.
  *
  */
  help(callback) {
    this.globalCommand.option("-h, --help", "Display this message");
    this.globalCommand.helpCallback = callback;
    this.showHelpOnExit = true;
    return this;
  }
  /**
  * Show version number when `-v, --version` flags appear.
  *
  */
  version(version, customFlags = "-v, --version") {
    this.globalCommand.version(version, customFlags);
    this.showVersionOnExit = true;
    return this;
  }
  /**
  * Add a global example.
  *
  * This example added here will not be used by sub-commands.
  */
  example(example) {
    this.globalCommand.example(example);
    return this;
  }
  /**
  * Output the corresponding help message
  * When a sub-command is matched, output the help message for the command
  * Otherwise output the global one.
  *
  */
  outputHelp() {
    if (this.matchedCommand) this.matchedCommand.outputHelp();
    else this.globalCommand.outputHelp();
  }
  /**
  * Output the version number.
  *
  */
  outputVersion() {
    this.globalCommand.outputVersion();
  }
  setParsedInfo({ args, options }, matchedCommand, matchedCommandName) {
    this.args = args;
    this.options = options;
    if (matchedCommand) this.matchedCommand = matchedCommand;
    if (matchedCommandName) this.matchedCommandName = matchedCommandName;
    return this;
  }
  unsetMatchedCommand() {
    this.matchedCommand = void 0;
    this.matchedCommandName = void 0;
  }
  /**
  * Parse argv
  */
  parse(argv, { run = true } = {}) {
    if (!argv) {
      if (!runtimeProcessArgs) throw new Error("No argv provided and runtime process argv is not available.");
      argv = runtimeProcessArgs;
    }
    this.rawArgs = argv;
    if (!this.name) this.name = argv[1] ? getFileName(argv[1]) : "cli";
    let shouldParse = true;
    for (const command of this.commands) {
      const parsed = this.mri(argv.slice(2), command);
      const commandName = parsed.args[0];
      if (command.isMatched(commandName)) {
        shouldParse = false;
        const parsedInfo = {
          ...parsed,
          args: parsed.args.slice(1)
        };
        this.setParsedInfo(parsedInfo, command, commandName);
        this.dispatchEvent(new CustomEvent(`command:${commandName}`, { detail: command }));
      }
    }
    if (shouldParse) {
      for (const command of this.commands) if (command.isDefaultCommand) {
        shouldParse = false;
        const parsed = this.mri(argv.slice(2), command);
        this.setParsedInfo(parsed, command);
        this.dispatchEvent(new CustomEvent("command:!", { detail: command }));
      }
    }
    if (shouldParse) {
      const parsed = this.mri(argv.slice(2));
      this.setParsedInfo(parsed);
    }
    if (this.options.help && this.showHelpOnExit) {
      this.outputHelp();
      run = false;
      this.unsetMatchedCommand();
    }
    if (this.options.version && this.showVersionOnExit && this.matchedCommandName == null) {
      this.outputVersion();
      run = false;
      this.unsetMatchedCommand();
    }
    const parsedArgv = {
      args: this.args,
      options: this.options
    };
    if (run) this.runMatchedCommand();
    if (!this.matchedCommand && this.args[0]) this.dispatchEvent(new CustomEvent("command:*", { detail: this.args[0] }));
    return parsedArgv;
  }
  mri(argv, command) {
    const cliOptions = [...this.globalCommand.options, ...command ? command.options : []];
    const mriOptions = getMriOptions(cliOptions);
    let argsAfterDoubleDashes = [];
    const doubleDashesIndex = argv.indexOf("--");
    if (doubleDashesIndex !== -1) {
      argsAfterDoubleDashes = argv.slice(doubleDashesIndex + 1);
      argv = argv.slice(0, doubleDashesIndex);
    }
    let parsed = lib_default(argv, mriOptions);
    parsed = Object.keys(parsed).reduce((res, name) => {
      return {
        ...res,
        [camelcaseOptionName(name)]: parsed[name]
      };
    }, { _: [] });
    const args = parsed._;
    const options = { "--": argsAfterDoubleDashes };
    const ignoreDefault = command && command.config.ignoreOptionDefaultValue ? command.config.ignoreOptionDefaultValue : this.globalCommand.config.ignoreOptionDefaultValue;
    const transforms = /* @__PURE__ */ Object.create(null);
    for (const cliOption of cliOptions) {
      if (!ignoreDefault && cliOption.config.default !== void 0) for (const name of cliOption.names) options[name] = cliOption.config.default;
      if (Array.isArray(cliOption.config.type) && transforms[cliOption.name] === void 0) {
        transforms[cliOption.name] = /* @__PURE__ */ Object.create(null);
        transforms[cliOption.name].shouldTransform = true;
        transforms[cliOption.name].transformFunction = cliOption.config.type[0];
      }
    }
    for (const key of Object.keys(parsed)) if (key !== "_") {
      setDotProp(options, key.split("."), parsed[key]);
      setByType(options, transforms);
    }
    return {
      args,
      options
    };
  }
  runMatchedCommand() {
    const { args, options, matchedCommand: command } = this;
    if (!command || !command.commandAction) return;
    command.checkUnknownOptions();
    command.checkOptionValue();
    command.checkRequiredArgs();
    command.checkUnusedArgs();
    const actionArgs = [];
    command.args.forEach((arg, index) => {
      if (arg.variadic) actionArgs.push(args.slice(index));
      else actionArgs.push(args[index]);
    });
    actionArgs.push(options);
    return command.commandAction.apply(this, actionArgs);
  }
};
const cac = (name = "") => new CAC(name);

const STATE_DIR = path.join(os.tmpdir(), "dev-log");
const LOG_FILE = path.join(STATE_DIR, "dev-logs.json");
const PID_FILE = path.join(STATE_DIR, "dev-log.pid");
const PORT = 7331;
function ensureStateDir() {
  if (!fs.existsSync(STATE_DIR)) {
    fs.mkdirSync(STATE_DIR, { recursive: true });
  }
}
function writePid() {
  ensureStateDir();
  fs.writeFileSync(PID_FILE, String(process.pid));
}
function readPid() {
  try {
    const raw = fs.readFileSync(PID_FILE, "utf-8").trim();
    const pid = parseInt(raw, 10);
    return Number.isNaN(pid) ? null : pid;
  } catch {
    return null;
  }
}
function removePid() {
  try {
    fs.unlinkSync(PID_FILE);
  } catch {
  }
}
function readLogs(sessionId) {
  try {
    const data = fs.readFileSync(LOG_FILE, "utf-8");
    const logs = JSON.parse(data);
    if (sessionId) {
      return logs.filter((log) => log.sessionId === sessionId);
    }
    return logs;
  } catch {
    return [];
  }
}
function appendLogs(newLogs) {
  ensureStateDir();
  const existing = readLogs();
  fs.writeFileSync(LOG_FILE, JSON.stringify([...existing, ...newLogs], null, 2));
}
function clearLogs(sessionId) {
  if (!fs.existsSync(LOG_FILE)) return { deleted: 0 };
  if (!sessionId) {
    fs.unlinkSync(LOG_FILE);
    return { deleted: 0 };
  }
  const all = readLogs();
  const remaining = all.filter((log) => log.sessionId !== sessionId);
  const deleted = all.length - remaining.length;
  if (remaining.length === 0) {
    fs.unlinkSync(LOG_FILE);
  } else {
    fs.writeFileSync(LOG_FILE, JSON.stringify(remaining, null, 2));
  }
  return { deleted };
}
function resetLogs() {
  if (fs.existsSync(LOG_FILE)) {
    fs.unlinkSync(LOG_FILE);
  }
}

const MAX_BODY_SIZE = 10 * 1024 * 1024;
const addresses = {
  local: null,
  network: null,
  tunnel: null
};
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return null;
}
function isValidLogEntry(log) {
  if (!log || typeof log !== "object" || Array.isArray(log)) return false;
  return Object.keys(log).length > 0;
}
function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}
function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}
function safeParseUrl(reqUrl) {
  try {
    return new URL(reqUrl || "/", `http://localhost:${PORT}`);
  } catch {
    return null;
  }
}
function handleRequest(req, res) {
  cors(res);
  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }
  try {
    const url = safeParseUrl(req.url);
    if (!url) {
      json(res, 400, { error: "Invalid URL" });
      return;
    }
    if (req.method === "GET" && url.pathname === "/health") {
      json(res, 200, { status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
      return;
    }
    if (req.method === "GET" && url.pathname === "/") {
      json(res, 200, {
        name: "dev-log",
        status: "running",
        addresses,
        endpoints: {
          "POST /": "submit log(s)",
          "GET /logs": "read logs (optional ?sessionId=)",
          "DELETE /logs": "clear logs (optional ?sessionId=)",
          "GET /health": "health check"
        }
      });
      return;
    }
    if (req.method === "GET" && url.pathname === "/logs") {
      const sessionId = url.searchParams.get("sessionId") || void 0;
      json(res, 200, readLogs(sessionId));
      return;
    }
    if (req.method === "DELETE" && url.pathname === "/logs") {
      const sessionId = url.searchParams.get("sessionId") || void 0;
      json(res, 200, clearLogs(sessionId));
      return;
    }
    if (req.method === "POST" && (url.pathname === "/" || url.pathname === "/logs")) {
      let body = "";
      let size = 0;
      req.on("data", (chunk) => {
        size += chunk.length;
        if (size > MAX_BODY_SIZE) req.destroy();
        body += chunk.toString();
      });
      req.on("end", () => {
        try {
          const parsed = JSON.parse(body);
          const incoming = Array.isArray(parsed) ? parsed : [parsed];
          for (const log of incoming) {
            if (!isValidLogEntry(log)) {
              json(res, 400, { error: "Invalid log entry structure" });
              return;
            }
          }
          appendLogs(incoming);
          json(res, 200, { success: true });
        } catch (e) {
          json(res, 400, { error: e.message });
        }
      });
      req.on("error", () => json(res, 400, { error: "Request error" }));
      return;
    }
    res.writeHead(404);
    res.end("Not Found");
  } catch (e) {
    if (!res.headersSent) {
      json(res, 500, { error: "Internal server error" });
    }
  }
}
function createServer() {
  const server = http.createServer(handleRequest);
  server.on("clientError", (err, socket) => {
    try {
      socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
    } catch {
    }
  });
  server.on("error", () => {
  });
  return server;
}
function isRunning() {
  return new Promise((resolve) => {
    const probe = net.connect({ port: PORT, host: "localhost" });
    const done = (result) => {
      probe.destroy();
      resolve(result);
    };
    probe.on("connect", () => done(true));
    probe.on("error", () => done(false));
    setTimeout(() => done(false), 500);
  });
}

var axios$1 = {exports: {}};

var bind;
var hasRequiredBind;

function requireBind () {
	if (hasRequiredBind) return bind;
	hasRequiredBind = 1;
	bind = function bind(fn, thisArg) {
	  return function wrap() {
	    var args = new Array(arguments.length);
	    for (var i = 0; i < args.length; i++) {
	      args[i] = arguments[i];
	    }
	    return fn.apply(thisArg, args);
	  };
	};
	return bind;
}

var utils;
var hasRequiredUtils;

function requireUtils () {
	if (hasRequiredUtils) return utils;
	hasRequiredUtils = 1;
	var bind = requireBind();
	var toString = Object.prototype.toString;
	function isArray(val) {
	  return toString.call(val) === "[object Array]";
	}
	function isUndefined(val) {
	  return typeof val === "undefined";
	}
	function isBuffer(val) {
	  return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor) && typeof val.constructor.isBuffer === "function" && val.constructor.isBuffer(val);
	}
	function isArrayBuffer(val) {
	  return toString.call(val) === "[object ArrayBuffer]";
	}
	function isFormData(val) {
	  return typeof FormData !== "undefined" && val instanceof FormData;
	}
	function isArrayBufferView(val) {
	  var result;
	  if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView) {
	    result = ArrayBuffer.isView(val);
	  } else {
	    result = val && val.buffer && val.buffer instanceof ArrayBuffer;
	  }
	  return result;
	}
	function isString(val) {
	  return typeof val === "string";
	}
	function isNumber(val) {
	  return typeof val === "number";
	}
	function isObject(val) {
	  return val !== null && typeof val === "object";
	}
	function isPlainObject(val) {
	  if (toString.call(val) !== "[object Object]") {
	    return false;
	  }
	  var prototype = Object.getPrototypeOf(val);
	  return prototype === null || prototype === Object.prototype;
	}
	function isDate(val) {
	  return toString.call(val) === "[object Date]";
	}
	function isFile(val) {
	  return toString.call(val) === "[object File]";
	}
	function isBlob(val) {
	  return toString.call(val) === "[object Blob]";
	}
	function isFunction(val) {
	  return toString.call(val) === "[object Function]";
	}
	function isStream(val) {
	  return isObject(val) && isFunction(val.pipe);
	}
	function isURLSearchParams(val) {
	  return typeof URLSearchParams !== "undefined" && val instanceof URLSearchParams;
	}
	function trim(str) {
	  return str.trim ? str.trim() : str.replace(/^\s+|\s+$/g, "");
	}
	function isStandardBrowserEnv() {
	  if (typeof navigator !== "undefined" && (navigator.product === "ReactNative" || navigator.product === "NativeScript" || navigator.product === "NS")) {
	    return false;
	  }
	  return typeof window !== "undefined" && typeof document !== "undefined";
	}
	function forEach(obj, fn) {
	  if (obj === null || typeof obj === "undefined") {
	    return;
	  }
	  if (typeof obj !== "object") {
	    obj = [obj];
	  }
	  if (isArray(obj)) {
	    for (var i = 0, l = obj.length; i < l; i++) {
	      fn.call(null, obj[i], i, obj);
	    }
	  } else {
	    for (var key in obj) {
	      if (Object.prototype.hasOwnProperty.call(obj, key)) {
	        fn.call(null, obj[key], key, obj);
	      }
	    }
	  }
	}
	function merge() {
	  var result = {};
	  function assignValue(val, key) {
	    if (isPlainObject(result[key]) && isPlainObject(val)) {
	      result[key] = merge(result[key], val);
	    } else if (isPlainObject(val)) {
	      result[key] = merge({}, val);
	    } else if (isArray(val)) {
	      result[key] = val.slice();
	    } else {
	      result[key] = val;
	    }
	  }
	  for (var i = 0, l = arguments.length; i < l; i++) {
	    forEach(arguments[i], assignValue);
	  }
	  return result;
	}
	function extend(a, b, thisArg) {
	  forEach(b, function assignValue(val, key) {
	    if (thisArg && typeof val === "function") {
	      a[key] = bind(val, thisArg);
	    } else {
	      a[key] = val;
	    }
	  });
	  return a;
	}
	function stripBOM(content) {
	  if (content.charCodeAt(0) === 65279) {
	    content = content.slice(1);
	  }
	  return content;
	}
	utils = {
	  isArray,
	  isArrayBuffer,
	  isBuffer,
	  isFormData,
	  isArrayBufferView,
	  isString,
	  isNumber,
	  isObject,
	  isPlainObject,
	  isUndefined,
	  isDate,
	  isFile,
	  isBlob,
	  isFunction,
	  isStream,
	  isURLSearchParams,
	  isStandardBrowserEnv,
	  forEach,
	  merge,
	  extend,
	  trim,
	  stripBOM
	};
	return utils;
}

var buildURL;
var hasRequiredBuildURL;

function requireBuildURL () {
	if (hasRequiredBuildURL) return buildURL;
	hasRequiredBuildURL = 1;
	var utils = requireUtils();
	function encode(val) {
	  return encodeURIComponent(val).replace(/%3A/gi, ":").replace(/%24/g, "$").replace(/%2C/gi, ",").replace(/%20/g, "+").replace(/%5B/gi, "[").replace(/%5D/gi, "]");
	}
	buildURL = function buildURL(url, params, paramsSerializer) {
	  if (!params) {
	    return url;
	  }
	  var serializedParams;
	  if (paramsSerializer) {
	    serializedParams = paramsSerializer(params);
	  } else if (utils.isURLSearchParams(params)) {
	    serializedParams = params.toString();
	  } else {
	    var parts = [];
	    utils.forEach(params, function serialize(val, key) {
	      if (val === null || typeof val === "undefined") {
	        return;
	      }
	      if (utils.isArray(val)) {
	        key = key + "[]";
	      } else {
	        val = [val];
	      }
	      utils.forEach(val, function parseValue(v) {
	        if (utils.isDate(v)) {
	          v = v.toISOString();
	        } else if (utils.isObject(v)) {
	          v = JSON.stringify(v);
	        }
	        parts.push(encode(key) + "=" + encode(v));
	      });
	    });
	    serializedParams = parts.join("&");
	  }
	  if (serializedParams) {
	    var hashmarkIndex = url.indexOf("#");
	    if (hashmarkIndex !== -1) {
	      url = url.slice(0, hashmarkIndex);
	    }
	    url += (url.indexOf("?") === -1 ? "?" : "&") + serializedParams;
	  }
	  return url;
	};
	return buildURL;
}

var InterceptorManager_1;
var hasRequiredInterceptorManager;

function requireInterceptorManager () {
	if (hasRequiredInterceptorManager) return InterceptorManager_1;
	hasRequiredInterceptorManager = 1;
	var utils = requireUtils();
	function InterceptorManager() {
	  this.handlers = [];
	}
	InterceptorManager.prototype.use = function use(fulfilled, rejected, options) {
	  this.handlers.push({
	    fulfilled,
	    rejected,
	    synchronous: options ? options.synchronous : false,
	    runWhen: options ? options.runWhen : null
	  });
	  return this.handlers.length - 1;
	};
	InterceptorManager.prototype.eject = function eject(id) {
	  if (this.handlers[id]) {
	    this.handlers[id] = null;
	  }
	};
	InterceptorManager.prototype.forEach = function forEach(fn) {
	  utils.forEach(this.handlers, function forEachHandler(h) {
	    if (h !== null) {
	      fn(h);
	    }
	  });
	};
	InterceptorManager_1 = InterceptorManager;
	return InterceptorManager_1;
}

var normalizeHeaderName;
var hasRequiredNormalizeHeaderName;

function requireNormalizeHeaderName () {
	if (hasRequiredNormalizeHeaderName) return normalizeHeaderName;
	hasRequiredNormalizeHeaderName = 1;
	var utils = requireUtils();
	normalizeHeaderName = function normalizeHeaderName(headers, normalizedName) {
	  utils.forEach(headers, function processHeader(value, name) {
	    if (name !== normalizedName && name.toUpperCase() === normalizedName.toUpperCase()) {
	      headers[normalizedName] = value;
	      delete headers[name];
	    }
	  });
	};
	return normalizeHeaderName;
}

var enhanceError;
var hasRequiredEnhanceError;

function requireEnhanceError () {
	if (hasRequiredEnhanceError) return enhanceError;
	hasRequiredEnhanceError = 1;
	enhanceError = function enhanceError(error, config, code, request, response) {
	  error.config = config;
	  if (code) {
	    error.code = code;
	  }
	  error.request = request;
	  error.response = response;
	  error.isAxiosError = true;
	  error.toJSON = function toJSON() {
	    return {
	      // Standard
	      message: this.message,
	      name: this.name,
	      // Microsoft
	      description: this.description,
	      number: this.number,
	      // Mozilla
	      fileName: this.fileName,
	      lineNumber: this.lineNumber,
	      columnNumber: this.columnNumber,
	      stack: this.stack,
	      // Axios
	      config: this.config,
	      code: this.code
	    };
	  };
	  return error;
	};
	return enhanceError;
}

var createError;
var hasRequiredCreateError;

function requireCreateError () {
	if (hasRequiredCreateError) return createError;
	hasRequiredCreateError = 1;
	var enhanceError = requireEnhanceError();
	createError = function createError(message, config, code, request, response) {
	  var error = new Error(message);
	  return enhanceError(error, config, code, request, response);
	};
	return createError;
}

var settle;
var hasRequiredSettle;

function requireSettle () {
	if (hasRequiredSettle) return settle;
	hasRequiredSettle = 1;
	var createError = requireCreateError();
	settle = function settle(resolve, reject, response) {
	  var validateStatus = response.config.validateStatus;
	  if (!response.status || !validateStatus || validateStatus(response.status)) {
	    resolve(response);
	  } else {
	    reject(createError(
	      "Request failed with status code " + response.status,
	      response.config,
	      null,
	      response.request,
	      response
	    ));
	  }
	};
	return settle;
}

var cookies;
var hasRequiredCookies;

function requireCookies () {
	if (hasRequiredCookies) return cookies;
	hasRequiredCookies = 1;
	var utils = requireUtils();
	cookies = utils.isStandardBrowserEnv() ? (
	  // Standard browser envs support document.cookie
	  /* @__PURE__ */ (function standardBrowserEnv() {
	    return {
	      write: function write(name, value, expires, path, domain, secure) {
	        var cookie = [];
	        cookie.push(name + "=" + encodeURIComponent(value));
	        if (utils.isNumber(expires)) {
	          cookie.push("expires=" + new Date(expires).toGMTString());
	        }
	        if (utils.isString(path)) {
	          cookie.push("path=" + path);
	        }
	        if (utils.isString(domain)) {
	          cookie.push("domain=" + domain);
	        }
	        if (secure === true) {
	          cookie.push("secure");
	        }
	        document.cookie = cookie.join("; ");
	      },
	      read: function read(name) {
	        var match = document.cookie.match(new RegExp("(^|;\\s*)(" + name + ")=([^;]*)"));
	        return match ? decodeURIComponent(match[3]) : null;
	      },
	      remove: function remove(name) {
	        this.write(name, "", Date.now() - 864e5);
	      }
	    };
	  })()
	) : (
	  // Non standard browser env (web workers, react-native) lack needed support.
	  /* @__PURE__ */ (function nonStandardBrowserEnv() {
	    return {
	      write: function write() {
	      },
	      read: function read() {
	        return null;
	      },
	      remove: function remove() {
	      }
	    };
	  })()
	);
	return cookies;
}

var isAbsoluteURL;
var hasRequiredIsAbsoluteURL;

function requireIsAbsoluteURL () {
	if (hasRequiredIsAbsoluteURL) return isAbsoluteURL;
	hasRequiredIsAbsoluteURL = 1;
	isAbsoluteURL = function isAbsoluteURL(url) {
	  return /^([a-z][a-z\d\+\-\.]*:)?\/\//i.test(url);
	};
	return isAbsoluteURL;
}

var combineURLs;
var hasRequiredCombineURLs;

function requireCombineURLs () {
	if (hasRequiredCombineURLs) return combineURLs;
	hasRequiredCombineURLs = 1;
	combineURLs = function combineURLs(baseURL, relativeURL) {
	  return relativeURL ? baseURL.replace(/\/+$/, "") + "/" + relativeURL.replace(/^\/+/, "") : baseURL;
	};
	return combineURLs;
}

var buildFullPath;
var hasRequiredBuildFullPath;

function requireBuildFullPath () {
	if (hasRequiredBuildFullPath) return buildFullPath;
	hasRequiredBuildFullPath = 1;
	var isAbsoluteURL = requireIsAbsoluteURL();
	var combineURLs = requireCombineURLs();
	buildFullPath = function buildFullPath(baseURL, requestedURL) {
	  if (baseURL && !isAbsoluteURL(requestedURL)) {
	    return combineURLs(baseURL, requestedURL);
	  }
	  return requestedURL;
	};
	return buildFullPath;
}

var parseHeaders;
var hasRequiredParseHeaders;

function requireParseHeaders () {
	if (hasRequiredParseHeaders) return parseHeaders;
	hasRequiredParseHeaders = 1;
	var utils = requireUtils();
	var ignoreDuplicateOf = [
	  "age",
	  "authorization",
	  "content-length",
	  "content-type",
	  "etag",
	  "expires",
	  "from",
	  "host",
	  "if-modified-since",
	  "if-unmodified-since",
	  "last-modified",
	  "location",
	  "max-forwards",
	  "proxy-authorization",
	  "referer",
	  "retry-after",
	  "user-agent"
	];
	parseHeaders = function parseHeaders(headers) {
	  var parsed = {};
	  var key;
	  var val;
	  var i;
	  if (!headers) {
	    return parsed;
	  }
	  utils.forEach(headers.split("\n"), function parser(line) {
	    i = line.indexOf(":");
	    key = utils.trim(line.substr(0, i)).toLowerCase();
	    val = utils.trim(line.substr(i + 1));
	    if (key) {
	      if (parsed[key] && ignoreDuplicateOf.indexOf(key) >= 0) {
	        return;
	      }
	      if (key === "set-cookie") {
	        parsed[key] = (parsed[key] ? parsed[key] : []).concat([val]);
	      } else {
	        parsed[key] = parsed[key] ? parsed[key] + ", " + val : val;
	      }
	    }
	  });
	  return parsed;
	};
	return parseHeaders;
}

var isURLSameOrigin;
var hasRequiredIsURLSameOrigin;

function requireIsURLSameOrigin () {
	if (hasRequiredIsURLSameOrigin) return isURLSameOrigin;
	hasRequiredIsURLSameOrigin = 1;
	var utils = requireUtils();
	isURLSameOrigin = utils.isStandardBrowserEnv() ? (
	  // Standard browser envs have full support of the APIs needed to test
	  // whether the request URL is of the same origin as current location.
	  (function standardBrowserEnv() {
	    var msie = /(msie|trident)/i.test(navigator.userAgent);
	    var urlParsingNode = document.createElement("a");
	    var originURL;
	    function resolveURL(url) {
	      var href = url;
	      if (msie) {
	        urlParsingNode.setAttribute("href", href);
	        href = urlParsingNode.href;
	      }
	      urlParsingNode.setAttribute("href", href);
	      return {
	        href: urlParsingNode.href,
	        protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, "") : "",
	        host: urlParsingNode.host,
	        search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, "") : "",
	        hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, "") : "",
	        hostname: urlParsingNode.hostname,
	        port: urlParsingNode.port,
	        pathname: urlParsingNode.pathname.charAt(0) === "/" ? urlParsingNode.pathname : "/" + urlParsingNode.pathname
	      };
	    }
	    originURL = resolveURL(window.location.href);
	    return function isURLSameOrigin(requestURL) {
	      var parsed = utils.isString(requestURL) ? resolveURL(requestURL) : requestURL;
	      return parsed.protocol === originURL.protocol && parsed.host === originURL.host;
	    };
	  })()
	) : (
	  // Non standard browser envs (web workers, react-native) lack needed support.
	  /* @__PURE__ */ (function nonStandardBrowserEnv() {
	    return function isURLSameOrigin() {
	      return true;
	    };
	  })()
	);
	return isURLSameOrigin;
}

var xhr;
var hasRequiredXhr;

function requireXhr () {
	if (hasRequiredXhr) return xhr;
	hasRequiredXhr = 1;
	var utils = requireUtils();
	var settle = requireSettle();
	var cookies = requireCookies();
	var buildURL = requireBuildURL();
	var buildFullPath = requireBuildFullPath();
	var parseHeaders = requireParseHeaders();
	var isURLSameOrigin = requireIsURLSameOrigin();
	var createError = requireCreateError();
	xhr = function xhrAdapter(config) {
	  return new Promise(function dispatchXhrRequest(resolve, reject) {
	    var requestData = config.data;
	    var requestHeaders = config.headers;
	    var responseType = config.responseType;
	    if (utils.isFormData(requestData)) {
	      delete requestHeaders["Content-Type"];
	    }
	    var request = new XMLHttpRequest();
	    if (config.auth) {
	      var username = config.auth.username || "";
	      var password = config.auth.password ? unescape(encodeURIComponent(config.auth.password)) : "";
	      requestHeaders.Authorization = "Basic " + btoa(username + ":" + password);
	    }
	    var fullPath = buildFullPath(config.baseURL, config.url);
	    request.open(config.method.toUpperCase(), buildURL(fullPath, config.params, config.paramsSerializer), true);
	    request.timeout = config.timeout;
	    function onloadend() {
	      if (!request) {
	        return;
	      }
	      var responseHeaders = "getAllResponseHeaders" in request ? parseHeaders(request.getAllResponseHeaders()) : null;
	      var responseData = !responseType || responseType === "text" || responseType === "json" ? request.responseText : request.response;
	      var response = {
	        data: responseData,
	        status: request.status,
	        statusText: request.statusText,
	        headers: responseHeaders,
	        config,
	        request
	      };
	      settle(resolve, reject, response);
	      request = null;
	    }
	    if ("onloadend" in request) {
	      request.onloadend = onloadend;
	    } else {
	      request.onreadystatechange = function handleLoad() {
	        if (!request || request.readyState !== 4) {
	          return;
	        }
	        if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf("file:") === 0)) {
	          return;
	        }
	        setTimeout(onloadend);
	      };
	    }
	    request.onabort = function handleAbort() {
	      if (!request) {
	        return;
	      }
	      reject(createError("Request aborted", config, "ECONNABORTED", request));
	      request = null;
	    };
	    request.onerror = function handleError() {
	      reject(createError("Network Error", config, null, request));
	      request = null;
	    };
	    request.ontimeout = function handleTimeout() {
	      var timeoutErrorMessage = "timeout of " + config.timeout + "ms exceeded";
	      if (config.timeoutErrorMessage) {
	        timeoutErrorMessage = config.timeoutErrorMessage;
	      }
	      reject(createError(
	        timeoutErrorMessage,
	        config,
	        config.transitional && config.transitional.clarifyTimeoutError ? "ETIMEDOUT" : "ECONNABORTED",
	        request
	      ));
	      request = null;
	    };
	    if (utils.isStandardBrowserEnv()) {
	      var xsrfValue = (config.withCredentials || isURLSameOrigin(fullPath)) && config.xsrfCookieName ? cookies.read(config.xsrfCookieName) : void 0;
	      if (xsrfValue) {
	        requestHeaders[config.xsrfHeaderName] = xsrfValue;
	      }
	    }
	    if ("setRequestHeader" in request) {
	      utils.forEach(requestHeaders, function setRequestHeader(val, key) {
	        if (typeof requestData === "undefined" && key.toLowerCase() === "content-type") {
	          delete requestHeaders[key];
	        } else {
	          request.setRequestHeader(key, val);
	        }
	      });
	    }
	    if (!utils.isUndefined(config.withCredentials)) {
	      request.withCredentials = !!config.withCredentials;
	    }
	    if (responseType && responseType !== "json") {
	      request.responseType = config.responseType;
	    }
	    if (typeof config.onDownloadProgress === "function") {
	      request.addEventListener("progress", config.onDownloadProgress);
	    }
	    if (typeof config.onUploadProgress === "function" && request.upload) {
	      request.upload.addEventListener("progress", config.onUploadProgress);
	    }
	    if (config.cancelToken) {
	      config.cancelToken.promise.then(function onCanceled(cancel) {
	        if (!request) {
	          return;
	        }
	        request.abort();
	        reject(cancel);
	        request = null;
	      });
	    }
	    if (!requestData) {
	      requestData = null;
	    }
	    request.send(requestData);
	  });
	};
	return xhr;
}

var followRedirects = {exports: {}};

var src = {exports: {}};

var browser = {exports: {}};

var ms;
var hasRequiredMs;

function requireMs () {
	if (hasRequiredMs) return ms;
	hasRequiredMs = 1;
	var s = 1e3;
	var m = s * 60;
	var h = m * 60;
	var d = h * 24;
	var w = d * 7;
	var y = d * 365.25;
	ms = function(val, options) {
	  options = options || {};
	  var type = typeof val;
	  if (type === "string" && val.length > 0) {
	    return parse(val);
	  } else if (type === "number" && isFinite(val)) {
	    return options.long ? fmtLong(val) : fmtShort(val);
	  }
	  throw new Error(
	    "val is not a non-empty string or a valid number. val=" + JSON.stringify(val)
	  );
	};
	function parse(str) {
	  str = String(str);
	  if (str.length > 100) {
	    return;
	  }
	  var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
	    str
	  );
	  if (!match) {
	    return;
	  }
	  var n = parseFloat(match[1]);
	  var type = (match[2] || "ms").toLowerCase();
	  switch (type) {
	    case "years":
	    case "year":
	    case "yrs":
	    case "yr":
	    case "y":
	      return n * y;
	    case "weeks":
	    case "week":
	    case "w":
	      return n * w;
	    case "days":
	    case "day":
	    case "d":
	      return n * d;
	    case "hours":
	    case "hour":
	    case "hrs":
	    case "hr":
	    case "h":
	      return n * h;
	    case "minutes":
	    case "minute":
	    case "mins":
	    case "min":
	    case "m":
	      return n * m;
	    case "seconds":
	    case "second":
	    case "secs":
	    case "sec":
	    case "s":
	      return n * s;
	    case "milliseconds":
	    case "millisecond":
	    case "msecs":
	    case "msec":
	    case "ms":
	      return n;
	    default:
	      return void 0;
	  }
	}
	function fmtShort(ms) {
	  var msAbs = Math.abs(ms);
	  if (msAbs >= d) {
	    return Math.round(ms / d) + "d";
	  }
	  if (msAbs >= h) {
	    return Math.round(ms / h) + "h";
	  }
	  if (msAbs >= m) {
	    return Math.round(ms / m) + "m";
	  }
	  if (msAbs >= s) {
	    return Math.round(ms / s) + "s";
	  }
	  return ms + "ms";
	}
	function fmtLong(ms) {
	  var msAbs = Math.abs(ms);
	  if (msAbs >= d) {
	    return plural(ms, msAbs, d, "day");
	  }
	  if (msAbs >= h) {
	    return plural(ms, msAbs, h, "hour");
	  }
	  if (msAbs >= m) {
	    return plural(ms, msAbs, m, "minute");
	  }
	  if (msAbs >= s) {
	    return plural(ms, msAbs, s, "second");
	  }
	  return ms + " ms";
	}
	function plural(ms, msAbs, n, name) {
	  var isPlural = msAbs >= n * 1.5;
	  return Math.round(ms / n) + " " + name + (isPlural ? "s" : "");
	}
	return ms;
}

var common;
var hasRequiredCommon;

function requireCommon () {
	if (hasRequiredCommon) return common;
	hasRequiredCommon = 1;
	function setup(env) {
	  createDebug.debug = createDebug;
	  createDebug.default = createDebug;
	  createDebug.coerce = coerce;
	  createDebug.disable = disable;
	  createDebug.enable = enable;
	  createDebug.enabled = enabled;
	  createDebug.humanize = requireMs();
	  createDebug.destroy = destroy;
	  Object.keys(env).forEach((key) => {
	    createDebug[key] = env[key];
	  });
	  createDebug.names = [];
	  createDebug.skips = [];
	  createDebug.formatters = {};
	  function selectColor(namespace) {
	    let hash = 0;
	    for (let i = 0; i < namespace.length; i++) {
	      hash = (hash << 5) - hash + namespace.charCodeAt(i);
	      hash |= 0;
	    }
	    return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
	  }
	  createDebug.selectColor = selectColor;
	  function createDebug(namespace) {
	    let prevTime;
	    let enableOverride = null;
	    let namespacesCache;
	    let enabledCache;
	    function debug(...args) {
	      if (!debug.enabled) {
	        return;
	      }
	      const self = debug;
	      const curr = Number(/* @__PURE__ */ new Date());
	      const ms = curr - (prevTime || curr);
	      self.diff = ms;
	      self.prev = prevTime;
	      self.curr = curr;
	      prevTime = curr;
	      args[0] = createDebug.coerce(args[0]);
	      if (typeof args[0] !== "string") {
	        args.unshift("%O");
	      }
	      let index = 0;
	      args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
	        if (match === "%%") {
	          return "%";
	        }
	        index++;
	        const formatter = createDebug.formatters[format];
	        if (typeof formatter === "function") {
	          const val = args[index];
	          match = formatter.call(self, val);
	          args.splice(index, 1);
	          index--;
	        }
	        return match;
	      });
	      createDebug.formatArgs.call(self, args);
	      const logFn = self.log || createDebug.log;
	      logFn.apply(self, args);
	    }
	    debug.namespace = namespace;
	    debug.useColors = createDebug.useColors();
	    debug.color = createDebug.selectColor(namespace);
	    debug.extend = extend;
	    debug.destroy = createDebug.destroy;
	    Object.defineProperty(debug, "enabled", {
	      enumerable: true,
	      configurable: false,
	      get: () => {
	        if (enableOverride !== null) {
	          return enableOverride;
	        }
	        if (namespacesCache !== createDebug.namespaces) {
	          namespacesCache = createDebug.namespaces;
	          enabledCache = createDebug.enabled(namespace);
	        }
	        return enabledCache;
	      },
	      set: (v) => {
	        enableOverride = v;
	      }
	    });
	    if (typeof createDebug.init === "function") {
	      createDebug.init(debug);
	    }
	    return debug;
	  }
	  function extend(namespace, delimiter) {
	    const newDebug = createDebug(this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace);
	    newDebug.log = this.log;
	    return newDebug;
	  }
	  function enable(namespaces) {
	    createDebug.save(namespaces);
	    createDebug.namespaces = namespaces;
	    createDebug.names = [];
	    createDebug.skips = [];
	    let i;
	    const split = (typeof namespaces === "string" ? namespaces : "").split(/[\s,]+/);
	    const len = split.length;
	    for (i = 0; i < len; i++) {
	      if (!split[i]) {
	        continue;
	      }
	      namespaces = split[i].replace(/\*/g, ".*?");
	      if (namespaces[0] === "-") {
	        createDebug.skips.push(new RegExp("^" + namespaces.substr(1) + "$"));
	      } else {
	        createDebug.names.push(new RegExp("^" + namespaces + "$"));
	      }
	    }
	  }
	  function disable() {
	    const namespaces = [
	      ...createDebug.names.map(toNamespace),
	      ...createDebug.skips.map(toNamespace).map((namespace) => "-" + namespace)
	    ].join(",");
	    createDebug.enable("");
	    return namespaces;
	  }
	  function enabled(name) {
	    if (name[name.length - 1] === "*") {
	      return true;
	    }
	    let i;
	    let len;
	    for (i = 0, len = createDebug.skips.length; i < len; i++) {
	      if (createDebug.skips[i].test(name)) {
	        return false;
	      }
	    }
	    for (i = 0, len = createDebug.names.length; i < len; i++) {
	      if (createDebug.names[i].test(name)) {
	        return true;
	      }
	    }
	    return false;
	  }
	  function toNamespace(regexp) {
	    return regexp.toString().substring(2, regexp.toString().length - 2).replace(/\.\*\?$/, "*");
	  }
	  function coerce(val) {
	    if (val instanceof Error) {
	      return val.stack || val.message;
	    }
	    return val;
	  }
	  function destroy() {
	    console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
	  }
	  createDebug.enable(createDebug.load());
	  return createDebug;
	}
	common = setup;
	return common;
}

var hasRequiredBrowser;

function requireBrowser () {
	if (hasRequiredBrowser) return browser.exports;
	hasRequiredBrowser = 1;
	(function (module, exports$1) {
		exports$1.formatArgs = formatArgs;
		exports$1.save = save;
		exports$1.load = load;
		exports$1.useColors = useColors;
		exports$1.storage = localstorage();
		exports$1.destroy = /* @__PURE__ */ (() => {
		  let warned = false;
		  return () => {
		    if (!warned) {
		      warned = true;
		      console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
		    }
		  };
		})();
		exports$1.colors = [
		  "#0000CC",
		  "#0000FF",
		  "#0033CC",
		  "#0033FF",
		  "#0066CC",
		  "#0066FF",
		  "#0099CC",
		  "#0099FF",
		  "#00CC00",
		  "#00CC33",
		  "#00CC66",
		  "#00CC99",
		  "#00CCCC",
		  "#00CCFF",
		  "#3300CC",
		  "#3300FF",
		  "#3333CC",
		  "#3333FF",
		  "#3366CC",
		  "#3366FF",
		  "#3399CC",
		  "#3399FF",
		  "#33CC00",
		  "#33CC33",
		  "#33CC66",
		  "#33CC99",
		  "#33CCCC",
		  "#33CCFF",
		  "#6600CC",
		  "#6600FF",
		  "#6633CC",
		  "#6633FF",
		  "#66CC00",
		  "#66CC33",
		  "#9900CC",
		  "#9900FF",
		  "#9933CC",
		  "#9933FF",
		  "#99CC00",
		  "#99CC33",
		  "#CC0000",
		  "#CC0033",
		  "#CC0066",
		  "#CC0099",
		  "#CC00CC",
		  "#CC00FF",
		  "#CC3300",
		  "#CC3333",
		  "#CC3366",
		  "#CC3399",
		  "#CC33CC",
		  "#CC33FF",
		  "#CC6600",
		  "#CC6633",
		  "#CC9900",
		  "#CC9933",
		  "#CCCC00",
		  "#CCCC33",
		  "#FF0000",
		  "#FF0033",
		  "#FF0066",
		  "#FF0099",
		  "#FF00CC",
		  "#FF00FF",
		  "#FF3300",
		  "#FF3333",
		  "#FF3366",
		  "#FF3399",
		  "#FF33CC",
		  "#FF33FF",
		  "#FF6600",
		  "#FF6633",
		  "#FF9900",
		  "#FF9933",
		  "#FFCC00",
		  "#FFCC33"
		];
		function useColors() {
		  if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) {
		    return true;
		  }
		  if (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
		    return false;
		  }
		  return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || // Is firebug? http://stackoverflow.com/a/398120/376773
		  typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || // Is firefox >= v31?
		  // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
		  typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31 || // Double check webkit in userAgent just in case we are in a worker
		  typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
		}
		function formatArgs(args) {
		  args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module.exports.humanize(this.diff);
		  if (!this.useColors) {
		    return;
		  }
		  const c = "color: " + this.color;
		  args.splice(1, 0, c, "color: inherit");
		  let index = 0;
		  let lastC = 0;
		  args[0].replace(/%[a-zA-Z%]/g, (match) => {
		    if (match === "%%") {
		      return;
		    }
		    index++;
		    if (match === "%c") {
		      lastC = index;
		    }
		  });
		  args.splice(lastC, 0, c);
		}
		exports$1.log = console.debug || console.log || (() => {
		});
		function save(namespaces) {
		  try {
		    if (namespaces) {
		      exports$1.storage.setItem("debug", namespaces);
		    } else {
		      exports$1.storage.removeItem("debug");
		    }
		  } catch (error) {
		  }
		}
		function load() {
		  let r;
		  try {
		    r = exports$1.storage.getItem("debug");
		  } catch (error) {
		  }
		  if (!r && typeof process !== "undefined" && "env" in process) {
		    r = process.env.DEBUG;
		  }
		  return r;
		}
		function localstorage() {
		  try {
		    return localStorage;
		  } catch (error) {
		  }
		}
		module.exports = requireCommon()(exports$1);
		const { formatters } = module.exports;
		formatters.j = function(v) {
		  try {
		    return JSON.stringify(v);
		  } catch (error) {
		    return "[UnexpectedJSONParseError]: " + error.message;
		  }
		}; 
	} (browser, browser.exports));
	return browser.exports;
}

var node = {exports: {}};

var hasRequiredNode;

function requireNode () {
	if (hasRequiredNode) return node.exports;
	hasRequiredNode = 1;
	(function (module, exports$1) {
		const tty = require$$0$1;
		const util = require$$1;
		exports$1.init = init;
		exports$1.log = log;
		exports$1.formatArgs = formatArgs;
		exports$1.save = save;
		exports$1.load = load;
		exports$1.useColors = useColors;
		exports$1.destroy = util.deprecate(
		  () => {
		  },
		  "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."
		);
		exports$1.colors = [6, 2, 3, 4, 5, 1];
		try {
		  const supportsColor = require("supports-color");
		  if (supportsColor && (supportsColor.stderr || supportsColor).level >= 2) {
		    exports$1.colors = [
		      20,
		      21,
		      26,
		      27,
		      32,
		      33,
		      38,
		      39,
		      40,
		      41,
		      42,
		      43,
		      44,
		      45,
		      56,
		      57,
		      62,
		      63,
		      68,
		      69,
		      74,
		      75,
		      76,
		      77,
		      78,
		      79,
		      80,
		      81,
		      92,
		      93,
		      98,
		      99,
		      112,
		      113,
		      128,
		      129,
		      134,
		      135,
		      148,
		      149,
		      160,
		      161,
		      162,
		      163,
		      164,
		      165,
		      166,
		      167,
		      168,
		      169,
		      170,
		      171,
		      172,
		      173,
		      178,
		      179,
		      184,
		      185,
		      196,
		      197,
		      198,
		      199,
		      200,
		      201,
		      202,
		      203,
		      204,
		      205,
		      206,
		      207,
		      208,
		      209,
		      214,
		      215,
		      220,
		      221
		    ];
		  }
		} catch (error) {
		}
		exports$1.inspectOpts = Object.keys(process.env).filter((key) => {
		  return /^debug_/i.test(key);
		}).reduce((obj, key) => {
		  const prop = key.substring(6).toLowerCase().replace(/_([a-z])/g, (_, k) => {
		    return k.toUpperCase();
		  });
		  let val = process.env[key];
		  if (/^(yes|on|true|enabled)$/i.test(val)) {
		    val = true;
		  } else if (/^(no|off|false|disabled)$/i.test(val)) {
		    val = false;
		  } else if (val === "null") {
		    val = null;
		  } else {
		    val = Number(val);
		  }
		  obj[prop] = val;
		  return obj;
		}, {});
		function useColors() {
		  return "colors" in exports$1.inspectOpts ? Boolean(exports$1.inspectOpts.colors) : tty.isatty(process.stderr.fd);
		}
		function formatArgs(args) {
		  const { namespace: name, useColors: useColors2 } = this;
		  if (useColors2) {
		    const c = this.color;
		    const colorCode = "\x1B[3" + (c < 8 ? c : "8;5;" + c);
		    const prefix = `  ${colorCode};1m${name} \x1B[0m`;
		    args[0] = prefix + args[0].split("\n").join("\n" + prefix);
		    args.push(colorCode + "m+" + module.exports.humanize(this.diff) + "\x1B[0m");
		  } else {
		    args[0] = getDate() + name + " " + args[0];
		  }
		}
		function getDate() {
		  if (exports$1.inspectOpts.hideDate) {
		    return "";
		  }
		  return (/* @__PURE__ */ new Date()).toISOString() + " ";
		}
		function log(...args) {
		  return process.stderr.write(util.format(...args) + "\n");
		}
		function save(namespaces) {
		  if (namespaces) {
		    process.env.DEBUG = namespaces;
		  } else {
		    delete process.env.DEBUG;
		  }
		}
		function load() {
		  return process.env.DEBUG;
		}
		function init(debug) {
		  debug.inspectOpts = {};
		  const keys = Object.keys(exports$1.inspectOpts);
		  for (let i = 0; i < keys.length; i++) {
		    debug.inspectOpts[keys[i]] = exports$1.inspectOpts[keys[i]];
		  }
		}
		module.exports = requireCommon()(exports$1);
		const { formatters } = module.exports;
		formatters.o = function(v) {
		  this.inspectOpts.colors = this.useColors;
		  return util.inspect(v, this.inspectOpts).split("\n").map((str) => str.trim()).join(" ");
		};
		formatters.O = function(v) {
		  this.inspectOpts.colors = this.useColors;
		  return util.inspect(v, this.inspectOpts);
		}; 
	} (node, node.exports));
	return node.exports;
}

var hasRequiredSrc;

function requireSrc () {
	if (hasRequiredSrc) return src.exports;
	hasRequiredSrc = 1;
	if (typeof process === "undefined" || process.type === "renderer" || process.browser === true || process.__nwjs) {
	  src.exports = requireBrowser();
	} else {
	  src.exports = requireNode();
	}
	return src.exports;
}

var debug_1;
var hasRequiredDebug;

function requireDebug () {
	if (hasRequiredDebug) return debug_1;
	hasRequiredDebug = 1;
	var debug;
	debug_1 = function() {
	  if (!debug) {
	    try {
	      debug = requireSrc()("follow-redirects");
	    } catch (error) {
	    }
	    if (typeof debug !== "function") {
	      debug = function() {
	      };
	    }
	  }
	  debug.apply(null, arguments);
	};
	return debug_1;
}

var hasRequiredFollowRedirects;

function requireFollowRedirects () {
	if (hasRequiredFollowRedirects) return followRedirects.exports;
	hasRequiredFollowRedirects = 1;
	var url = require$$0$2;
	var URL = url.URL;
	var http$1 = http;
	var https = require$$2;
	var Writable = require$$3.Writable;
	var assert = require$$4;
	var debug = requireDebug();
	(function detectUnsupportedEnvironment() {
	  var looksLikeNode = typeof process !== "undefined";
	  var looksLikeBrowser = typeof window !== "undefined" && typeof document !== "undefined";
	  var looksLikeV8 = isFunction(Error.captureStackTrace);
	  if (!looksLikeNode && (looksLikeBrowser || !looksLikeV8)) {
	    console.warn("The follow-redirects package should be excluded from browser builds.");
	  }
	})();
	var useNativeURL = false;
	try {
	  assert(new URL(""));
	} catch (error) {
	  useNativeURL = error.code === "ERR_INVALID_URL";
	}
	var preservedUrlFields = [
	  "auth",
	  "host",
	  "hostname",
	  "href",
	  "path",
	  "pathname",
	  "port",
	  "protocol",
	  "query",
	  "search",
	  "hash"
	];
	var events = ["abort", "aborted", "connect", "error", "socket", "timeout"];
	var eventHandlers = /* @__PURE__ */ Object.create(null);
	events.forEach(function(event) {
	  eventHandlers[event] = function(arg1, arg2, arg3) {
	    this._redirectable.emit(event, arg1, arg2, arg3);
	  };
	});
	var InvalidUrlError = createErrorType(
	  "ERR_INVALID_URL",
	  "Invalid URL",
	  TypeError
	);
	var RedirectionError = createErrorType(
	  "ERR_FR_REDIRECTION_FAILURE",
	  "Redirected request failed"
	);
	var TooManyRedirectsError = createErrorType(
	  "ERR_FR_TOO_MANY_REDIRECTS",
	  "Maximum number of redirects exceeded",
	  RedirectionError
	);
	var MaxBodyLengthExceededError = createErrorType(
	  "ERR_FR_MAX_BODY_LENGTH_EXCEEDED",
	  "Request body larger than maxBodyLength limit"
	);
	var WriteAfterEndError = createErrorType(
	  "ERR_STREAM_WRITE_AFTER_END",
	  "write after end"
	);
	var destroy = Writable.prototype.destroy || noop;
	function RedirectableRequest(options, responseCallback) {
	  Writable.call(this);
	  this._sanitizeOptions(options);
	  this._options = options;
	  this._ended = false;
	  this._ending = false;
	  this._redirectCount = 0;
	  this._redirects = [];
	  this._requestBodyLength = 0;
	  this._requestBodyBuffers = [];
	  if (responseCallback) {
	    this.on("response", responseCallback);
	  }
	  var self = this;
	  this._onNativeResponse = function(response) {
	    try {
	      self._processResponse(response);
	    } catch (cause) {
	      self.emit("error", cause instanceof RedirectionError ? cause : new RedirectionError({ cause }));
	    }
	  };
	  this._performRequest();
	}
	RedirectableRequest.prototype = Object.create(Writable.prototype);
	RedirectableRequest.prototype.abort = function() {
	  destroyRequest(this._currentRequest);
	  this._currentRequest.abort();
	  this.emit("abort");
	};
	RedirectableRequest.prototype.destroy = function(error) {
	  destroyRequest(this._currentRequest, error);
	  destroy.call(this, error);
	  return this;
	};
	RedirectableRequest.prototype.write = function(data, encoding, callback) {
	  if (this._ending) {
	    throw new WriteAfterEndError();
	  }
	  if (!isString(data) && !isBuffer(data)) {
	    throw new TypeError("data should be a string, Buffer or Uint8Array");
	  }
	  if (isFunction(encoding)) {
	    callback = encoding;
	    encoding = null;
	  }
	  if (data.length === 0) {
	    if (callback) {
	      callback();
	    }
	    return;
	  }
	  if (this._requestBodyLength + data.length <= this._options.maxBodyLength) {
	    this._requestBodyLength += data.length;
	    this._requestBodyBuffers.push({ data, encoding });
	    this._currentRequest.write(data, encoding, callback);
	  } else {
	    this.emit("error", new MaxBodyLengthExceededError());
	    this.abort();
	  }
	};
	RedirectableRequest.prototype.end = function(data, encoding, callback) {
	  if (isFunction(data)) {
	    callback = data;
	    data = encoding = null;
	  } else if (isFunction(encoding)) {
	    callback = encoding;
	    encoding = null;
	  }
	  if (!data) {
	    this._ended = this._ending = true;
	    this._currentRequest.end(null, null, callback);
	  } else {
	    var self = this;
	    var currentRequest = this._currentRequest;
	    this.write(data, encoding, function() {
	      self._ended = true;
	      currentRequest.end(null, null, callback);
	    });
	    this._ending = true;
	  }
	};
	RedirectableRequest.prototype.setHeader = function(name, value) {
	  this._options.headers[name] = value;
	  this._currentRequest.setHeader(name, value);
	};
	RedirectableRequest.prototype.removeHeader = function(name) {
	  delete this._options.headers[name];
	  this._currentRequest.removeHeader(name);
	};
	RedirectableRequest.prototype.setTimeout = function(msecs, callback) {
	  var self = this;
	  function destroyOnTimeout(socket) {
	    socket.setTimeout(msecs);
	    socket.removeListener("timeout", socket.destroy);
	    socket.addListener("timeout", socket.destroy);
	  }
	  function startTimer(socket) {
	    if (self._timeout) {
	      clearTimeout(self._timeout);
	    }
	    self._timeout = setTimeout(function() {
	      self.emit("timeout");
	      clearTimer();
	    }, msecs);
	    destroyOnTimeout(socket);
	  }
	  function clearTimer() {
	    if (self._timeout) {
	      clearTimeout(self._timeout);
	      self._timeout = null;
	    }
	    self.removeListener("abort", clearTimer);
	    self.removeListener("error", clearTimer);
	    self.removeListener("response", clearTimer);
	    self.removeListener("close", clearTimer);
	    if (callback) {
	      self.removeListener("timeout", callback);
	    }
	    if (!self.socket) {
	      self._currentRequest.removeListener("socket", startTimer);
	    }
	  }
	  if (callback) {
	    this.on("timeout", callback);
	  }
	  if (this.socket) {
	    startTimer(this.socket);
	  } else {
	    this._currentRequest.once("socket", startTimer);
	  }
	  this.on("socket", destroyOnTimeout);
	  this.on("abort", clearTimer);
	  this.on("error", clearTimer);
	  this.on("response", clearTimer);
	  this.on("close", clearTimer);
	  return this;
	};
	[
	  "flushHeaders",
	  "getHeader",
	  "setNoDelay",
	  "setSocketKeepAlive"
	].forEach(function(method) {
	  RedirectableRequest.prototype[method] = function(a, b) {
	    return this._currentRequest[method](a, b);
	  };
	});
	["aborted", "connection", "socket"].forEach(function(property) {
	  Object.defineProperty(RedirectableRequest.prototype, property, {
	    get: function() {
	      return this._currentRequest[property];
	    }
	  });
	});
	RedirectableRequest.prototype._sanitizeOptions = function(options) {
	  if (!options.headers) {
	    options.headers = {};
	  }
	  if (options.host) {
	    if (!options.hostname) {
	      options.hostname = options.host;
	    }
	    delete options.host;
	  }
	  if (!options.pathname && options.path) {
	    var searchPos = options.path.indexOf("?");
	    if (searchPos < 0) {
	      options.pathname = options.path;
	    } else {
	      options.pathname = options.path.substring(0, searchPos);
	      options.search = options.path.substring(searchPos);
	    }
	  }
	};
	RedirectableRequest.prototype._performRequest = function() {
	  var protocol = this._options.protocol;
	  var nativeProtocol = this._options.nativeProtocols[protocol];
	  if (!nativeProtocol) {
	    throw new TypeError("Unsupported protocol " + protocol);
	  }
	  if (this._options.agents) {
	    var scheme = protocol.slice(0, -1);
	    this._options.agent = this._options.agents[scheme];
	  }
	  var request = this._currentRequest = nativeProtocol.request(this._options, this._onNativeResponse);
	  request._redirectable = this;
	  for (var event of events) {
	    request.on(event, eventHandlers[event]);
	  }
	  this._currentUrl = /^\//.test(this._options.path) ? url.format(this._options) : (
	    // When making a request to a proxy, […]
	    // a client MUST send the target URI in absolute-form […].
	    this._options.path
	  );
	  if (this._isRedirect) {
	    var i = 0;
	    var self = this;
	    var buffers = this._requestBodyBuffers;
	    (function writeNext(error) {
	      if (request === self._currentRequest) {
	        if (error) {
	          self.emit("error", error);
	        } else if (i < buffers.length) {
	          var buffer = buffers[i++];
	          if (!request.finished) {
	            request.write(buffer.data, buffer.encoding, writeNext);
	          }
	        } else if (self._ended) {
	          request.end();
	        }
	      }
	    })();
	  }
	};
	RedirectableRequest.prototype._processResponse = function(response) {
	  var statusCode = response.statusCode;
	  if (this._options.trackRedirects) {
	    this._redirects.push({
	      url: this._currentUrl,
	      headers: response.headers,
	      statusCode
	    });
	  }
	  var location = response.headers.location;
	  if (!location || this._options.followRedirects === false || statusCode < 300 || statusCode >= 400) {
	    response.responseUrl = this._currentUrl;
	    response.redirects = this._redirects;
	    this.emit("response", response);
	    this._requestBodyBuffers = [];
	    return;
	  }
	  destroyRequest(this._currentRequest);
	  response.destroy();
	  if (++this._redirectCount > this._options.maxRedirects) {
	    throw new TooManyRedirectsError();
	  }
	  var requestHeaders;
	  var beforeRedirect = this._options.beforeRedirect;
	  if (beforeRedirect) {
	    requestHeaders = Object.assign({
	      // The Host header was set by nativeProtocol.request
	      Host: response.req.getHeader("host")
	    }, this._options.headers);
	  }
	  var method = this._options.method;
	  if ((statusCode === 301 || statusCode === 302) && this._options.method === "POST" || // RFC7231§6.4.4: The 303 (See Other) status code indicates that
	  // the server is redirecting the user agent to a different resource […]
	  // A user agent can perform a retrieval request targeting that URI
	  // (a GET or HEAD request if using HTTP) […]
	  statusCode === 303 && !/^(?:GET|HEAD)$/.test(this._options.method)) {
	    this._options.method = "GET";
	    this._requestBodyBuffers = [];
	    removeMatchingHeaders(/^content-/i, this._options.headers);
	  }
	  var currentHostHeader = removeMatchingHeaders(/^host$/i, this._options.headers);
	  var currentUrlParts = parseUrl(this._currentUrl);
	  var currentHost = currentHostHeader || currentUrlParts.host;
	  var currentUrl = /^\w+:/.test(location) ? this._currentUrl : url.format(Object.assign(currentUrlParts, { host: currentHost }));
	  var redirectUrl = resolveUrl(location, currentUrl);
	  debug("redirecting to", redirectUrl.href);
	  this._isRedirect = true;
	  spreadUrlObject(redirectUrl, this._options);
	  if (redirectUrl.protocol !== currentUrlParts.protocol && redirectUrl.protocol !== "https:" || redirectUrl.host !== currentHost && !isSubdomain(redirectUrl.host, currentHost)) {
	    removeMatchingHeaders(/^(?:(?:proxy-)?authorization|cookie)$/i, this._options.headers);
	  }
	  if (isFunction(beforeRedirect)) {
	    var responseDetails = {
	      headers: response.headers,
	      statusCode
	    };
	    var requestDetails = {
	      url: currentUrl,
	      method,
	      headers: requestHeaders
	    };
	    beforeRedirect(this._options, responseDetails, requestDetails);
	    this._sanitizeOptions(this._options);
	  }
	  this._performRequest();
	};
	function wrap(protocols) {
	  var exports$1 = {
	    maxRedirects: 21,
	    maxBodyLength: 10 * 1024 * 1024
	  };
	  var nativeProtocols = {};
	  Object.keys(protocols).forEach(function(scheme) {
	    var protocol = scheme + ":";
	    var nativeProtocol = nativeProtocols[protocol] = protocols[scheme];
	    var wrappedProtocol = exports$1[scheme] = Object.create(nativeProtocol);
	    function request(input, options, callback) {
	      if (isURL(input)) {
	        input = spreadUrlObject(input);
	      } else if (isString(input)) {
	        input = spreadUrlObject(parseUrl(input));
	      } else {
	        callback = options;
	        options = validateUrl(input);
	        input = { protocol };
	      }
	      if (isFunction(options)) {
	        callback = options;
	        options = null;
	      }
	      options = Object.assign({
	        maxRedirects: exports$1.maxRedirects,
	        maxBodyLength: exports$1.maxBodyLength
	      }, input, options);
	      options.nativeProtocols = nativeProtocols;
	      if (!isString(options.host) && !isString(options.hostname)) {
	        options.hostname = "::1";
	      }
	      assert.equal(options.protocol, protocol, "protocol mismatch");
	      debug("options", options);
	      return new RedirectableRequest(options, callback);
	    }
	    function get(input, options, callback) {
	      var wrappedRequest = wrappedProtocol.request(input, options, callback);
	      wrappedRequest.end();
	      return wrappedRequest;
	    }
	    Object.defineProperties(wrappedProtocol, {
	      request: { value: request, configurable: true, enumerable: true, writable: true },
	      get: { value: get, configurable: true, enumerable: true, writable: true }
	    });
	  });
	  return exports$1;
	}
	function noop() {
	}
	function parseUrl(input) {
	  var parsed;
	  if (useNativeURL) {
	    parsed = new URL(input);
	  } else {
	    parsed = validateUrl(url.parse(input));
	    if (!isString(parsed.protocol)) {
	      throw new InvalidUrlError({ input });
	    }
	  }
	  return parsed;
	}
	function resolveUrl(relative, base) {
	  return useNativeURL ? new URL(relative, base) : parseUrl(url.resolve(base, relative));
	}
	function validateUrl(input) {
	  if (/^\[/.test(input.hostname) && !/^\[[:0-9a-f]+\]$/i.test(input.hostname)) {
	    throw new InvalidUrlError({ input: input.href || input });
	  }
	  if (/^\[/.test(input.host) && !/^\[[:0-9a-f]+\](:\d+)?$/i.test(input.host)) {
	    throw new InvalidUrlError({ input: input.href || input });
	  }
	  return input;
	}
	function spreadUrlObject(urlObject, target) {
	  var spread = target || {};
	  for (var key of preservedUrlFields) {
	    spread[key] = urlObject[key];
	  }
	  if (spread.hostname.startsWith("[")) {
	    spread.hostname = spread.hostname.slice(1, -1);
	  }
	  if (spread.port !== "") {
	    spread.port = Number(spread.port);
	  }
	  spread.path = spread.search ? spread.pathname + spread.search : spread.pathname;
	  return spread;
	}
	function removeMatchingHeaders(regex, headers) {
	  var lastValue;
	  for (var header in headers) {
	    if (regex.test(header)) {
	      lastValue = headers[header];
	      delete headers[header];
	    }
	  }
	  return lastValue === null || typeof lastValue === "undefined" ? void 0 : String(lastValue).trim();
	}
	function createErrorType(code, message, baseClass) {
	  function CustomError(properties) {
	    if (isFunction(Error.captureStackTrace)) {
	      Error.captureStackTrace(this, this.constructor);
	    }
	    Object.assign(this, properties || {});
	    this.code = code;
	    this.message = this.cause ? message + ": " + this.cause.message : message;
	  }
	  CustomError.prototype = new (baseClass || Error)();
	  Object.defineProperties(CustomError.prototype, {
	    constructor: {
	      value: CustomError,
	      enumerable: false
	    },
	    name: {
	      value: "Error [" + code + "]",
	      enumerable: false
	    }
	  });
	  return CustomError;
	}
	function destroyRequest(request, error) {
	  for (var event of events) {
	    request.removeListener(event, eventHandlers[event]);
	  }
	  request.on("error", noop);
	  request.destroy(error);
	}
	function isSubdomain(subdomain, domain) {
	  assert(isString(subdomain) && isString(domain));
	  var dot = subdomain.length - domain.length - 1;
	  return dot > 0 && subdomain[dot] === "." && subdomain.endsWith(domain);
	}
	function isString(value) {
	  return typeof value === "string" || value instanceof String;
	}
	function isFunction(value) {
	  return typeof value === "function";
	}
	function isBuffer(value) {
	  return typeof value === "object" && "length" in value;
	}
	function isURL(value) {
	  return URL && value instanceof URL;
	}
	followRedirects.exports = wrap({ http: http$1, https });
	followRedirects.exports.wrap = wrap;
	return followRedirects.exports;
}

var version = "0.21.4";
var require$$0 = {
	version: version};

var http_1;
var hasRequiredHttp;

function requireHttp () {
	if (hasRequiredHttp) return http_1;
	hasRequiredHttp = 1;
	var utils = requireUtils();
	var settle = requireSettle();
	var buildFullPath = requireBuildFullPath();
	var buildURL = requireBuildURL();
	var http$1 = http;
	var https = require$$2;
	var httpFollow = requireFollowRedirects().http;
	var httpsFollow = requireFollowRedirects().https;
	var url = require$$0$2;
	var zlib = require$$8;
	var pkg = require$$0;
	var createError = requireCreateError();
	var enhanceError = requireEnhanceError();
	var isHttps = /https:?/;
	function setProxy(options, proxy, location) {
	  options.hostname = proxy.host;
	  options.host = proxy.host;
	  options.port = proxy.port;
	  options.path = location;
	  if (proxy.auth) {
	    var base64 = Buffer.from(proxy.auth.username + ":" + proxy.auth.password, "utf8").toString("base64");
	    options.headers["Proxy-Authorization"] = "Basic " + base64;
	  }
	  options.beforeRedirect = function beforeRedirect(redirection) {
	    redirection.headers.host = redirection.host;
	    setProxy(redirection, proxy, redirection.href);
	  };
	}
	http_1 = function httpAdapter(config) {
	  return new Promise(function dispatchHttpRequest(resolvePromise, rejectPromise) {
	    var resolve = function resolve2(value) {
	      resolvePromise(value);
	    };
	    var reject = function reject2(value) {
	      rejectPromise(value);
	    };
	    var data = config.data;
	    var headers = config.headers;
	    if ("User-Agent" in headers || "user-agent" in headers) {
	      if (!headers["User-Agent"] && !headers["user-agent"]) {
	        delete headers["User-Agent"];
	        delete headers["user-agent"];
	      }
	    } else {
	      headers["User-Agent"] = "axios/" + pkg.version;
	    }
	    if (data && !utils.isStream(data)) {
	      if (Buffer.isBuffer(data)) ; else if (utils.isArrayBuffer(data)) {
	        data = Buffer.from(new Uint8Array(data));
	      } else if (utils.isString(data)) {
	        data = Buffer.from(data, "utf-8");
	      } else {
	        return reject(createError(
	          "Data after transformation must be a string, an ArrayBuffer, a Buffer, or a Stream",
	          config
	        ));
	      }
	      headers["Content-Length"] = data.length;
	    }
	    var auth = void 0;
	    if (config.auth) {
	      var username = config.auth.username || "";
	      var password = config.auth.password || "";
	      auth = username + ":" + password;
	    }
	    var fullPath = buildFullPath(config.baseURL, config.url);
	    var parsed = url.parse(fullPath);
	    var protocol = parsed.protocol || "http:";
	    if (!auth && parsed.auth) {
	      var urlAuth = parsed.auth.split(":");
	      var urlUsername = urlAuth[0] || "";
	      var urlPassword = urlAuth[1] || "";
	      auth = urlUsername + ":" + urlPassword;
	    }
	    if (auth) {
	      delete headers.Authorization;
	    }
	    var isHttpsRequest = isHttps.test(protocol);
	    var agent = isHttpsRequest ? config.httpsAgent : config.httpAgent;
	    var options = {
	      path: buildURL(parsed.path, config.params, config.paramsSerializer).replace(/^\?/, ""),
	      method: config.method.toUpperCase(),
	      headers,
	      agent,
	      agents: { http: config.httpAgent, https: config.httpsAgent },
	      auth
	    };
	    if (config.socketPath) {
	      options.socketPath = config.socketPath;
	    } else {
	      options.hostname = parsed.hostname;
	      options.port = parsed.port;
	    }
	    var proxy = config.proxy;
	    if (!proxy && proxy !== false) {
	      var proxyEnv = protocol.slice(0, -1) + "_proxy";
	      var proxyUrl = process.env[proxyEnv] || process.env[proxyEnv.toUpperCase()];
	      if (proxyUrl) {
	        var parsedProxyUrl = url.parse(proxyUrl);
	        var noProxyEnv = process.env.no_proxy || process.env.NO_PROXY;
	        var shouldProxy = true;
	        if (noProxyEnv) {
	          var noProxy = noProxyEnv.split(",").map(function trim(s) {
	            return s.trim();
	          });
	          shouldProxy = !noProxy.some(function proxyMatch(proxyElement) {
	            if (!proxyElement) {
	              return false;
	            }
	            if (proxyElement === "*") {
	              return true;
	            }
	            if (proxyElement[0] === "." && parsed.hostname.substr(parsed.hostname.length - proxyElement.length) === proxyElement) {
	              return true;
	            }
	            return parsed.hostname === proxyElement;
	          });
	        }
	        if (shouldProxy) {
	          proxy = {
	            host: parsedProxyUrl.hostname,
	            port: parsedProxyUrl.port,
	            protocol: parsedProxyUrl.protocol
	          };
	          if (parsedProxyUrl.auth) {
	            var proxyUrlAuth = parsedProxyUrl.auth.split(":");
	            proxy.auth = {
	              username: proxyUrlAuth[0],
	              password: proxyUrlAuth[1]
	            };
	          }
	        }
	      }
	    }
	    if (proxy) {
	      options.headers.host = parsed.hostname + (parsed.port ? ":" + parsed.port : "");
	      setProxy(options, proxy, protocol + "//" + parsed.hostname + (parsed.port ? ":" + parsed.port : "") + options.path);
	    }
	    var transport;
	    var isHttpsProxy = isHttpsRequest && (proxy ? isHttps.test(proxy.protocol) : true);
	    if (config.transport) {
	      transport = config.transport;
	    } else if (config.maxRedirects === 0) {
	      transport = isHttpsProxy ? https : http$1;
	    } else {
	      if (config.maxRedirects) {
	        options.maxRedirects = config.maxRedirects;
	      }
	      transport = isHttpsProxy ? httpsFollow : httpFollow;
	    }
	    if (config.maxBodyLength > -1) {
	      options.maxBodyLength = config.maxBodyLength;
	    }
	    var req = transport.request(options, function handleResponse(res) {
	      if (req.aborted) return;
	      var stream = res;
	      var lastRequest = res.req || req;
	      if (res.statusCode !== 204 && lastRequest.method !== "HEAD" && config.decompress !== false) {
	        switch (res.headers["content-encoding"]) {
	          /*eslint default-case:0*/
	          case "gzip":
	          case "compress":
	          case "deflate":
	            stream = stream.pipe(zlib.createUnzip());
	            delete res.headers["content-encoding"];
	            break;
	        }
	      }
	      var response = {
	        status: res.statusCode,
	        statusText: res.statusMessage,
	        headers: res.headers,
	        config,
	        request: lastRequest
	      };
	      if (config.responseType === "stream") {
	        response.data = stream;
	        settle(resolve, reject, response);
	      } else {
	        var responseBuffer = [];
	        var totalResponseBytes = 0;
	        stream.on("data", function handleStreamData(chunk) {
	          responseBuffer.push(chunk);
	          totalResponseBytes += chunk.length;
	          if (config.maxContentLength > -1 && totalResponseBytes > config.maxContentLength) {
	            stream.destroy();
	            reject(createError(
	              "maxContentLength size of " + config.maxContentLength + " exceeded",
	              config,
	              null,
	              lastRequest
	            ));
	          }
	        });
	        stream.on("error", function handleStreamError(err) {
	          if (req.aborted) return;
	          reject(enhanceError(err, config, null, lastRequest));
	        });
	        stream.on("end", function handleStreamEnd() {
	          var responseData = Buffer.concat(responseBuffer);
	          if (config.responseType !== "arraybuffer") {
	            responseData = responseData.toString(config.responseEncoding);
	            if (!config.responseEncoding || config.responseEncoding === "utf8") {
	              responseData = utils.stripBOM(responseData);
	            }
	          }
	          response.data = responseData;
	          settle(resolve, reject, response);
	        });
	      }
	    });
	    req.on("error", function handleRequestError(err) {
	      if (req.aborted && err.code !== "ERR_FR_TOO_MANY_REDIRECTS") return;
	      reject(enhanceError(err, config, null, req));
	    });
	    if (config.timeout) {
	      var timeout = parseInt(config.timeout, 10);
	      if (isNaN(timeout)) {
	        reject(createError(
	          "error trying to parse `config.timeout` to int",
	          config,
	          "ERR_PARSE_TIMEOUT",
	          req
	        ));
	        return;
	      }
	      req.setTimeout(timeout, function handleRequestTimeout() {
	        req.abort();
	        reject(createError(
	          "timeout of " + timeout + "ms exceeded",
	          config,
	          config.transitional && config.transitional.clarifyTimeoutError ? "ETIMEDOUT" : "ECONNABORTED",
	          req
	        ));
	      });
	    }
	    if (config.cancelToken) {
	      config.cancelToken.promise.then(function onCanceled(cancel) {
	        if (req.aborted) return;
	        req.abort();
	        reject(cancel);
	      });
	    }
	    if (utils.isStream(data)) {
	      data.on("error", function handleStreamError(err) {
	        reject(enhanceError(err, config, null, req));
	      }).pipe(req);
	    } else {
	      req.end(data);
	    }
	  });
	};
	return http_1;
}

var defaults_1;
var hasRequiredDefaults;

function requireDefaults () {
	if (hasRequiredDefaults) return defaults_1;
	hasRequiredDefaults = 1;
	var utils = requireUtils();
	var normalizeHeaderName = requireNormalizeHeaderName();
	var enhanceError = requireEnhanceError();
	var DEFAULT_CONTENT_TYPE = {
	  "Content-Type": "application/x-www-form-urlencoded"
	};
	function setContentTypeIfUnset(headers, value) {
	  if (!utils.isUndefined(headers) && utils.isUndefined(headers["Content-Type"])) {
	    headers["Content-Type"] = value;
	  }
	}
	function getDefaultAdapter() {
	  var adapter;
	  if (typeof XMLHttpRequest !== "undefined") {
	    adapter = requireXhr();
	  } else if (typeof process !== "undefined" && Object.prototype.toString.call(process) === "[object process]") {
	    adapter = requireHttp();
	  }
	  return adapter;
	}
	function stringifySafely(rawValue, parser, encoder) {
	  if (utils.isString(rawValue)) {
	    try {
	      (parser || JSON.parse)(rawValue);
	      return utils.trim(rawValue);
	    } catch (e) {
	      if (e.name !== "SyntaxError") {
	        throw e;
	      }
	    }
	  }
	  return (encoder || JSON.stringify)(rawValue);
	}
	var defaults = {
	  transitional: {
	    silentJSONParsing: true,
	    forcedJSONParsing: true,
	    clarifyTimeoutError: false
	  },
	  adapter: getDefaultAdapter(),
	  transformRequest: [function transformRequest(data, headers) {
	    normalizeHeaderName(headers, "Accept");
	    normalizeHeaderName(headers, "Content-Type");
	    if (utils.isFormData(data) || utils.isArrayBuffer(data) || utils.isBuffer(data) || utils.isStream(data) || utils.isFile(data) || utils.isBlob(data)) {
	      return data;
	    }
	    if (utils.isArrayBufferView(data)) {
	      return data.buffer;
	    }
	    if (utils.isURLSearchParams(data)) {
	      setContentTypeIfUnset(headers, "application/x-www-form-urlencoded;charset=utf-8");
	      return data.toString();
	    }
	    if (utils.isObject(data) || headers && headers["Content-Type"] === "application/json") {
	      setContentTypeIfUnset(headers, "application/json");
	      return stringifySafely(data);
	    }
	    return data;
	  }],
	  transformResponse: [function transformResponse(data) {
	    var transitional = this.transitional;
	    var silentJSONParsing = transitional && transitional.silentJSONParsing;
	    var forcedJSONParsing = transitional && transitional.forcedJSONParsing;
	    var strictJSONParsing = !silentJSONParsing && this.responseType === "json";
	    if (strictJSONParsing || forcedJSONParsing && utils.isString(data) && data.length) {
	      try {
	        return JSON.parse(data);
	      } catch (e) {
	        if (strictJSONParsing) {
	          if (e.name === "SyntaxError") {
	            throw enhanceError(e, this, "E_JSON_PARSE");
	          }
	          throw e;
	        }
	      }
	    }
	    return data;
	  }],
	  /**
	   * A timeout in milliseconds to abort a request. If set to 0 (default) a
	   * timeout is not created.
	   */
	  timeout: 0,
	  xsrfCookieName: "XSRF-TOKEN",
	  xsrfHeaderName: "X-XSRF-TOKEN",
	  maxContentLength: -1,
	  maxBodyLength: -1,
	  validateStatus: function validateStatus(status) {
	    return status >= 200 && status < 300;
	  }
	};
	defaults.headers = {
	  common: {
	    "Accept": "application/json, text/plain, */*"
	  }
	};
	utils.forEach(["delete", "get", "head"], function forEachMethodNoData(method) {
	  defaults.headers[method] = {};
	});
	utils.forEach(["post", "put", "patch"], function forEachMethodWithData(method) {
	  defaults.headers[method] = utils.merge(DEFAULT_CONTENT_TYPE);
	});
	defaults_1 = defaults;
	return defaults_1;
}

var transformData;
var hasRequiredTransformData;

function requireTransformData () {
	if (hasRequiredTransformData) return transformData;
	hasRequiredTransformData = 1;
	var utils = requireUtils();
	var defaults = requireDefaults();
	transformData = function transformData(data, headers, fns) {
	  var context = this || defaults;
	  utils.forEach(fns, function transform(fn) {
	    data = fn.call(context, data, headers);
	  });
	  return data;
	};
	return transformData;
}

var isCancel;
var hasRequiredIsCancel;

function requireIsCancel () {
	if (hasRequiredIsCancel) return isCancel;
	hasRequiredIsCancel = 1;
	isCancel = function isCancel(value) {
	  return !!(value && value.__CANCEL__);
	};
	return isCancel;
}

var dispatchRequest;
var hasRequiredDispatchRequest;

function requireDispatchRequest () {
	if (hasRequiredDispatchRequest) return dispatchRequest;
	hasRequiredDispatchRequest = 1;
	var utils = requireUtils();
	var transformData = requireTransformData();
	var isCancel = requireIsCancel();
	var defaults = requireDefaults();
	function throwIfCancellationRequested(config) {
	  if (config.cancelToken) {
	    config.cancelToken.throwIfRequested();
	  }
	}
	dispatchRequest = function dispatchRequest(config) {
	  throwIfCancellationRequested(config);
	  config.headers = config.headers || {};
	  config.data = transformData.call(
	    config,
	    config.data,
	    config.headers,
	    config.transformRequest
	  );
	  config.headers = utils.merge(
	    config.headers.common || {},
	    config.headers[config.method] || {},
	    config.headers
	  );
	  utils.forEach(
	    ["delete", "get", "head", "post", "put", "patch", "common"],
	    function cleanHeaderConfig(method) {
	      delete config.headers[method];
	    }
	  );
	  var adapter = config.adapter || defaults.adapter;
	  return adapter(config).then(function onAdapterResolution(response) {
	    throwIfCancellationRequested(config);
	    response.data = transformData.call(
	      config,
	      response.data,
	      response.headers,
	      config.transformResponse
	    );
	    return response;
	  }, function onAdapterRejection(reason) {
	    if (!isCancel(reason)) {
	      throwIfCancellationRequested(config);
	      if (reason && reason.response) {
	        reason.response.data = transformData.call(
	          config,
	          reason.response.data,
	          reason.response.headers,
	          config.transformResponse
	        );
	      }
	    }
	    return Promise.reject(reason);
	  });
	};
	return dispatchRequest;
}

var mergeConfig;
var hasRequiredMergeConfig;

function requireMergeConfig () {
	if (hasRequiredMergeConfig) return mergeConfig;
	hasRequiredMergeConfig = 1;
	var utils = requireUtils();
	mergeConfig = function mergeConfig(config1, config2) {
	  config2 = config2 || {};
	  var config = {};
	  var valueFromConfig2Keys = ["url", "method", "data"];
	  var mergeDeepPropertiesKeys = ["headers", "auth", "proxy", "params"];
	  var defaultToConfig2Keys = [
	    "baseURL",
	    "transformRequest",
	    "transformResponse",
	    "paramsSerializer",
	    "timeout",
	    "timeoutMessage",
	    "withCredentials",
	    "adapter",
	    "responseType",
	    "xsrfCookieName",
	    "xsrfHeaderName",
	    "onUploadProgress",
	    "onDownloadProgress",
	    "decompress",
	    "maxContentLength",
	    "maxBodyLength",
	    "maxRedirects",
	    "transport",
	    "httpAgent",
	    "httpsAgent",
	    "cancelToken",
	    "socketPath",
	    "responseEncoding"
	  ];
	  var directMergeKeys = ["validateStatus"];
	  function getMergedValue(target, source) {
	    if (utils.isPlainObject(target) && utils.isPlainObject(source)) {
	      return utils.merge(target, source);
	    } else if (utils.isPlainObject(source)) {
	      return utils.merge({}, source);
	    } else if (utils.isArray(source)) {
	      return source.slice();
	    }
	    return source;
	  }
	  function mergeDeepProperties(prop) {
	    if (!utils.isUndefined(config2[prop])) {
	      config[prop] = getMergedValue(config1[prop], config2[prop]);
	    } else if (!utils.isUndefined(config1[prop])) {
	      config[prop] = getMergedValue(void 0, config1[prop]);
	    }
	  }
	  utils.forEach(valueFromConfig2Keys, function valueFromConfig2(prop) {
	    if (!utils.isUndefined(config2[prop])) {
	      config[prop] = getMergedValue(void 0, config2[prop]);
	    }
	  });
	  utils.forEach(mergeDeepPropertiesKeys, mergeDeepProperties);
	  utils.forEach(defaultToConfig2Keys, function defaultToConfig2(prop) {
	    if (!utils.isUndefined(config2[prop])) {
	      config[prop] = getMergedValue(void 0, config2[prop]);
	    } else if (!utils.isUndefined(config1[prop])) {
	      config[prop] = getMergedValue(void 0, config1[prop]);
	    }
	  });
	  utils.forEach(directMergeKeys, function merge(prop) {
	    if (prop in config2) {
	      config[prop] = getMergedValue(config1[prop], config2[prop]);
	    } else if (prop in config1) {
	      config[prop] = getMergedValue(void 0, config1[prop]);
	    }
	  });
	  var axiosKeys = valueFromConfig2Keys.concat(mergeDeepPropertiesKeys).concat(defaultToConfig2Keys).concat(directMergeKeys);
	  var otherKeys = Object.keys(config1).concat(Object.keys(config2)).filter(function filterAxiosKeys(key) {
	    return axiosKeys.indexOf(key) === -1;
	  });
	  utils.forEach(otherKeys, mergeDeepProperties);
	  return config;
	};
	return mergeConfig;
}

var validator;
var hasRequiredValidator;

function requireValidator () {
	if (hasRequiredValidator) return validator;
	hasRequiredValidator = 1;
	var pkg = require$$0;
	var validators = {};
	["object", "boolean", "number", "function", "string", "symbol"].forEach(function(type, i) {
	  validators[type] = function validator(thing) {
	    return typeof thing === type || "a" + (i < 1 ? "n " : " ") + type;
	  };
	});
	var deprecatedWarnings = {};
	var currentVerArr = pkg.version.split(".");
	function isOlderVersion(version, thanVersion) {
	  var pkgVersionArr = thanVersion ? thanVersion.split(".") : currentVerArr;
	  var destVer = version.split(".");
	  for (var i = 0; i < 3; i++) {
	    if (pkgVersionArr[i] > destVer[i]) {
	      return true;
	    } else if (pkgVersionArr[i] < destVer[i]) {
	      return false;
	    }
	  }
	  return false;
	}
	validators.transitional = function transitional(validator, version, message) {
	  var isDeprecated = version && isOlderVersion(version);
	  function formatMessage(opt, desc) {
	    return "[Axios v" + pkg.version + "] Transitional option '" + opt + "'" + desc + (message ? ". " + message : "");
	  }
	  return function(value, opt, opts) {
	    if (validator === false) {
	      throw new Error(formatMessage(opt, " has been removed in " + version));
	    }
	    if (isDeprecated && !deprecatedWarnings[opt]) {
	      deprecatedWarnings[opt] = true;
	      console.warn(
	        formatMessage(
	          opt,
	          " has been deprecated since v" + version + " and will be removed in the near future"
	        )
	      );
	    }
	    return validator ? validator(value, opt, opts) : true;
	  };
	};
	function assertOptions(options, schema, allowUnknown) {
	  if (typeof options !== "object") {
	    throw new TypeError("options must be an object");
	  }
	  var keys = Object.keys(options);
	  var i = keys.length;
	  while (i-- > 0) {
	    var opt = keys[i];
	    var validator = schema[opt];
	    if (validator) {
	      var value = options[opt];
	      var result = value === void 0 || validator(value, opt, options);
	      if (result !== true) {
	        throw new TypeError("option " + opt + " must be " + result);
	      }
	      continue;
	    }
	    if (allowUnknown !== true) {
	      throw Error("Unknown option " + opt);
	    }
	  }
	}
	validator = {
	  isOlderVersion,
	  assertOptions,
	  validators
	};
	return validator;
}

var Axios_1;
var hasRequiredAxios$2;

function requireAxios$2 () {
	if (hasRequiredAxios$2) return Axios_1;
	hasRequiredAxios$2 = 1;
	var utils = requireUtils();
	var buildURL = requireBuildURL();
	var InterceptorManager = requireInterceptorManager();
	var dispatchRequest = requireDispatchRequest();
	var mergeConfig = requireMergeConfig();
	var validator = requireValidator();
	var validators = validator.validators;
	function Axios(instanceConfig) {
	  this.defaults = instanceConfig;
	  this.interceptors = {
	    request: new InterceptorManager(),
	    response: new InterceptorManager()
	  };
	}
	Axios.prototype.request = function request(config) {
	  if (typeof config === "string") {
	    config = arguments[1] || {};
	    config.url = arguments[0];
	  } else {
	    config = config || {};
	  }
	  config = mergeConfig(this.defaults, config);
	  if (config.method) {
	    config.method = config.method.toLowerCase();
	  } else if (this.defaults.method) {
	    config.method = this.defaults.method.toLowerCase();
	  } else {
	    config.method = "get";
	  }
	  var transitional = config.transitional;
	  if (transitional !== void 0) {
	    validator.assertOptions(transitional, {
	      silentJSONParsing: validators.transitional(validators.boolean, "1.0.0"),
	      forcedJSONParsing: validators.transitional(validators.boolean, "1.0.0"),
	      clarifyTimeoutError: validators.transitional(validators.boolean, "1.0.0")
	    }, false);
	  }
	  var requestInterceptorChain = [];
	  var synchronousRequestInterceptors = true;
	  this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
	    if (typeof interceptor.runWhen === "function" && interceptor.runWhen(config) === false) {
	      return;
	    }
	    synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;
	    requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
	  });
	  var responseInterceptorChain = [];
	  this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
	    responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
	  });
	  var promise;
	  if (!synchronousRequestInterceptors) {
	    var chain = [dispatchRequest, void 0];
	    Array.prototype.unshift.apply(chain, requestInterceptorChain);
	    chain = chain.concat(responseInterceptorChain);
	    promise = Promise.resolve(config);
	    while (chain.length) {
	      promise = promise.then(chain.shift(), chain.shift());
	    }
	    return promise;
	  }
	  var newConfig = config;
	  while (requestInterceptorChain.length) {
	    var onFulfilled = requestInterceptorChain.shift();
	    var onRejected = requestInterceptorChain.shift();
	    try {
	      newConfig = onFulfilled(newConfig);
	    } catch (error) {
	      onRejected(error);
	      break;
	    }
	  }
	  try {
	    promise = dispatchRequest(newConfig);
	  } catch (error) {
	    return Promise.reject(error);
	  }
	  while (responseInterceptorChain.length) {
	    promise = promise.then(responseInterceptorChain.shift(), responseInterceptorChain.shift());
	  }
	  return promise;
	};
	Axios.prototype.getUri = function getUri(config) {
	  config = mergeConfig(this.defaults, config);
	  return buildURL(config.url, config.params, config.paramsSerializer).replace(/^\?/, "");
	};
	utils.forEach(["delete", "get", "head", "options"], function forEachMethodNoData(method) {
	  Axios.prototype[method] = function(url, config) {
	    return this.request(mergeConfig(config || {}, {
	      method,
	      url,
	      data: (config || {}).data
	    }));
	  };
	});
	utils.forEach(["post", "put", "patch"], function forEachMethodWithData(method) {
	  Axios.prototype[method] = function(url, data, config) {
	    return this.request(mergeConfig(config || {}, {
	      method,
	      url,
	      data
	    }));
	  };
	});
	Axios_1 = Axios;
	return Axios_1;
}

var Cancel_1;
var hasRequiredCancel;

function requireCancel () {
	if (hasRequiredCancel) return Cancel_1;
	hasRequiredCancel = 1;
	function Cancel(message) {
	  this.message = message;
	}
	Cancel.prototype.toString = function toString() {
	  return "Cancel" + (this.message ? ": " + this.message : "");
	};
	Cancel.prototype.__CANCEL__ = true;
	Cancel_1 = Cancel;
	return Cancel_1;
}

var CancelToken_1;
var hasRequiredCancelToken;

function requireCancelToken () {
	if (hasRequiredCancelToken) return CancelToken_1;
	hasRequiredCancelToken = 1;
	var Cancel = requireCancel();
	function CancelToken(executor) {
	  if (typeof executor !== "function") {
	    throw new TypeError("executor must be a function.");
	  }
	  var resolvePromise;
	  this.promise = new Promise(function promiseExecutor(resolve) {
	    resolvePromise = resolve;
	  });
	  var token = this;
	  executor(function cancel(message) {
	    if (token.reason) {
	      return;
	    }
	    token.reason = new Cancel(message);
	    resolvePromise(token.reason);
	  });
	}
	CancelToken.prototype.throwIfRequested = function throwIfRequested() {
	  if (this.reason) {
	    throw this.reason;
	  }
	};
	CancelToken.source = function source() {
	  var cancel;
	  var token = new CancelToken(function executor(c) {
	    cancel = c;
	  });
	  return {
	    token,
	    cancel
	  };
	};
	CancelToken_1 = CancelToken;
	return CancelToken_1;
}

var spread;
var hasRequiredSpread;

function requireSpread () {
	if (hasRequiredSpread) return spread;
	hasRequiredSpread = 1;
	spread = function spread(callback) {
	  return function wrap(arr) {
	    return callback.apply(null, arr);
	  };
	};
	return spread;
}

var isAxiosError;
var hasRequiredIsAxiosError;

function requireIsAxiosError () {
	if (hasRequiredIsAxiosError) return isAxiosError;
	hasRequiredIsAxiosError = 1;
	isAxiosError = function isAxiosError(payload) {
	  return typeof payload === "object" && payload.isAxiosError === true;
	};
	return isAxiosError;
}

var hasRequiredAxios$1;

function requireAxios$1 () {
	if (hasRequiredAxios$1) return axios$1.exports;
	hasRequiredAxios$1 = 1;
	var utils = requireUtils();
	var bind = requireBind();
	var Axios = requireAxios$2();
	var mergeConfig = requireMergeConfig();
	var defaults = requireDefaults();
	function createInstance(defaultConfig) {
	  var context = new Axios(defaultConfig);
	  var instance = bind(Axios.prototype.request, context);
	  utils.extend(instance, Axios.prototype, context);
	  utils.extend(instance, context);
	  return instance;
	}
	var axios = createInstance(defaults);
	axios.Axios = Axios;
	axios.create = function create(instanceConfig) {
	  return createInstance(mergeConfig(axios.defaults, instanceConfig));
	};
	axios.Cancel = requireCancel();
	axios.CancelToken = requireCancelToken();
	axios.isCancel = requireIsCancel();
	axios.all = function all(promises) {
	  return Promise.all(promises);
	};
	axios.spread = requireSpread();
	axios.isAxiosError = requireIsAxiosError();
	axios$1.exports = axios;
	axios$1.exports.default = axios;
	return axios$1.exports;
}

var axios;
var hasRequiredAxios;

function requireAxios () {
	if (hasRequiredAxios) return axios;
	hasRequiredAxios = 1;
	axios = requireAxios$1();
	return axios;
}

var HeaderHostTransformer_1;
var hasRequiredHeaderHostTransformer;

function requireHeaderHostTransformer () {
	if (hasRequiredHeaderHostTransformer) return HeaderHostTransformer_1;
	hasRequiredHeaderHostTransformer = 1;
	const { Transform } = require$$3;
	class HeaderHostTransformer extends Transform {
	  constructor(opts = {}) {
	    super(opts);
	    this.host = opts.host || "localhost";
	    this.replaced = false;
	  }
	  _transform(data, encoding, callback) {
	    callback(
	      null,
	      this.replaced ? data : data.toString().replace(/(\r\n[Hh]ost: )\S+/, (match, $1) => {
	        this.replaced = true;
	        return $1 + this.host;
	      })
	    );
	  }
	}
	HeaderHostTransformer_1 = HeaderHostTransformer;
	return HeaderHostTransformer_1;
}

var TunnelCluster_1;
var hasRequiredTunnelCluster;

function requireTunnelCluster () {
	if (hasRequiredTunnelCluster) return TunnelCluster_1;
	hasRequiredTunnelCluster = 1;
	const { EventEmitter } = require$$0$3;
	const debug = requireSrc()("localtunnel:client");
	const fs$1 = fs;
	const net$1 = net;
	const tls = require$$4$1;
	const HeaderHostTransformer = requireHeaderHostTransformer();
	TunnelCluster_1 = class TunnelCluster extends EventEmitter {
	  constructor(opts = {}) {
	    super(opts);
	    this.opts = opts;
	  }
	  open() {
	    const opt = this.opts;
	    const remoteHostOrIp = opt.remote_ip || opt.remote_host;
	    const remotePort = opt.remote_port;
	    const localHost = opt.local_host || "localhost";
	    const localPort = opt.local_port;
	    const localProtocol = opt.local_https ? "https" : "http";
	    const allowInvalidCert = opt.allow_invalid_cert;
	    debug(
	      "establishing tunnel %s://%s:%s <> %s:%s",
	      localProtocol,
	      localHost,
	      localPort,
	      remoteHostOrIp,
	      remotePort
	    );
	    const remote = net$1.connect({
	      host: remoteHostOrIp,
	      port: remotePort
	    });
	    remote.setKeepAlive(true);
	    remote.on("error", (err) => {
	      debug("got remote connection error", err.message);
	      if (err.code === "ECONNREFUSED") {
	        this.emit(
	          "error",
	          new Error(
	            `connection refused: ${remoteHostOrIp}:${remotePort} (check your firewall settings)`
	          )
	        );
	      }
	      remote.end();
	    });
	    const connLocal = () => {
	      if (remote.destroyed) {
	        debug("remote destroyed");
	        this.emit("dead");
	        return;
	      }
	      debug("connecting locally to %s://%s:%d", localProtocol, localHost, localPort);
	      remote.pause();
	      if (allowInvalidCert) {
	        debug("allowing invalid certificates");
	      }
	      const getLocalCertOpts = () => allowInvalidCert ? { rejectUnauthorized: false } : {
	        cert: fs$1.readFileSync(opt.local_cert),
	        key: fs$1.readFileSync(opt.local_key),
	        ca: opt.local_ca ? [fs$1.readFileSync(opt.local_ca)] : void 0
	      };
	      const local = opt.local_https ? tls.connect({ host: localHost, port: localPort, ...getLocalCertOpts() }) : net$1.connect({ host: localHost, port: localPort });
	      const remoteClose = () => {
	        debug("remote close");
	        this.emit("dead");
	        local.end();
	      };
	      remote.once("close", remoteClose);
	      local.once("error", (err) => {
	        debug("local error %s", err.message);
	        local.end();
	        remote.removeListener("close", remoteClose);
	        if (err.code !== "ECONNREFUSED") {
	          return remote.end();
	        }
	        setTimeout(connLocal, 1e3);
	      });
	      local.once("connect", () => {
	        debug("connected locally");
	        remote.resume();
	        let stream = remote;
	        if (opt.local_host) {
	          debug("transform Host header to %s", opt.local_host);
	          stream = remote.pipe(new HeaderHostTransformer({ host: opt.local_host }));
	        }
	        stream.pipe(local).pipe(remote);
	        local.once("close", (hadError) => {
	          debug("local connection closed [%s]", hadError);
	        });
	      });
	    };
	    remote.on("data", (data) => {
	      const match = data.toString().match(/^(\w+) (\S+)/);
	      if (match) {
	        this.emit("request", {
	          method: match[1],
	          path: match[2]
	        });
	      }
	    });
	    remote.once("connect", () => {
	      this.emit("open", remote);
	      connLocal();
	    });
	  }
	};
	return TunnelCluster_1;
}

var Tunnel_1;
var hasRequiredTunnel;

function requireTunnel () {
	if (hasRequiredTunnel) return Tunnel_1;
	hasRequiredTunnel = 1;
	const { parse } = require$$0$2;
	const { EventEmitter } = require$$0$3;
	const axios = requireAxios();
	const debug = requireSrc()("localtunnel:client");
	const TunnelCluster = requireTunnelCluster();
	Tunnel_1 = class Tunnel extends EventEmitter {
	  constructor(opts = {}) {
	    super(opts);
	    this.opts = opts;
	    this.closed = false;
	    if (!this.opts.host) {
	      this.opts.host = "https://localtunnel.me";
	    }
	  }
	  _getInfo(body) {
	    const { id, ip, port, url, cached_url, max_conn_count } = body;
	    const { host, port: local_port, local_host } = this.opts;
	    const { local_https, local_cert, local_key, local_ca, allow_invalid_cert } = this.opts;
	    return {
	      name: id,
	      url,
	      cached_url,
	      max_conn: max_conn_count || 1,
	      remote_host: parse(host).hostname,
	      remote_ip: ip,
	      remote_port: port,
	      local_port,
	      local_host,
	      local_https,
	      local_cert,
	      local_key,
	      local_ca,
	      allow_invalid_cert
	    };
	  }
	  // initialize connection
	  // callback with connection info
	  _init(cb) {
	    const opt = this.opts;
	    const getInfo = this._getInfo.bind(this);
	    const params = {
	      responseType: "json"
	    };
	    const baseUri = `${opt.host}/`;
	    const assignedDomain = opt.subdomain;
	    const uri = baseUri + (assignedDomain || "?new");
	    (function getUrl() {
	      axios.get(uri, params).then((res) => {
	        const body = res.data;
	        debug("got tunnel information", res.data);
	        if (res.status !== 200) {
	          const err = new Error(
	            body && body.message || "localtunnel server returned an error, please try again"
	          );
	          return cb(err);
	        }
	        cb(null, getInfo(body));
	      }).catch((err) => {
	        debug(`tunnel server offline: ${err.message}, retry 1s`);
	        return setTimeout(getUrl, 1e3);
	      });
	    })();
	  }
	  _establish(info) {
	    this.setMaxListeners(info.max_conn + (EventEmitter.defaultMaxListeners || 10));
	    this.tunnelCluster = new TunnelCluster(info);
	    this.tunnelCluster.once("open", () => {
	      this.emit("url", info.url);
	    });
	    this.tunnelCluster.on("error", (err) => {
	      debug("got socket error", err.message);
	      this.emit("error", err);
	    });
	    let tunnelCount = 0;
	    this.tunnelCluster.on("open", (tunnel) => {
	      tunnelCount++;
	      debug("tunnel open [total: %d]", tunnelCount);
	      const closeHandler = () => {
	        tunnel.destroy();
	      };
	      if (this.closed) {
	        return closeHandler();
	      }
	      this.once("close", closeHandler);
	      tunnel.once("close", () => {
	        this.removeListener("close", closeHandler);
	      });
	    });
	    this.tunnelCluster.on("dead", () => {
	      tunnelCount--;
	      debug("tunnel dead [total: %d]", tunnelCount);
	      if (this.closed) {
	        return;
	      }
	      this.tunnelCluster.open();
	    });
	    this.tunnelCluster.on("request", (req) => {
	      this.emit("request", req);
	    });
	    for (let count = 0; count < info.max_conn; ++count) {
	      this.tunnelCluster.open();
	    }
	  }
	  open(cb) {
	    this._init((err, info) => {
	      if (err) {
	        return cb(err);
	      }
	      this.clientId = info.name;
	      this.url = info.url;
	      if (info.cached_url) {
	        this.cachedUrl = info.cached_url;
	      }
	      this._establish(info);
	      cb();
	    });
	  }
	  close() {
	    this.closed = true;
	    this.emit("close");
	  }
	};
	return Tunnel_1;
}

var localtunnel$1;
var hasRequiredLocaltunnel;

function requireLocaltunnel () {
	if (hasRequiredLocaltunnel) return localtunnel$1;
	hasRequiredLocaltunnel = 1;
	const Tunnel = requireTunnel();
	localtunnel$1 = function localtunnel(arg1, arg2, arg3) {
	  const options = typeof arg1 === "object" ? arg1 : { ...arg2, port: arg1 };
	  const callback = typeof arg1 === "object" ? arg2 : arg3;
	  const client = new Tunnel(options);
	  if (callback) {
	    client.open((err) => err ? callback(err) : callback(null, client));
	    return client;
	  }
	  return new Promise(
	    (resolve, reject) => client.open((err) => err ? reject(err) : resolve(client))
	  );
	};
	return localtunnel$1;
}

var localtunnelExports = requireLocaltunnel();
var localtunnel = /*@__PURE__*/getDefaultExportFromCjs(localtunnelExports);

async function startTunnel() {
  const tunnel = await localtunnel({ port: PORT });
  return tunnel.url;
}

function jsLiteral(input) {
  const dataExpr = input.data && input.data.trim() ? input.data : "{}";
  const typeValue = input.ready ? `'__ready__'` : `'${input.type}'`;
  const dataValue = input.ready ? `{url:location.href,protocol:location.protocol}` : dataExpr;
  return `{sessionId:'${input.sessionId}',time:new Date().toTimeString().split(' ')[0],type:${typeValue},data:${dataValue}}`;
}
const renderers = {
  // ---- JS family: emit native object literals, fetch with .catch ----
  js(input) {
    return `fetch('${input.url}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(${jsLiteral(input)})}).catch(()=>{})`;
  },
  ts: (input) => renderers.js(input),
  jsx: (input) => renderers.js(input),
  tsx: (input) => renderers.js(input),
  // ---- Languages that POST a raw JSON string ----
  python(input) {
    const dataExpr = input.data && input.data.trim() ? input.data : "{}";
    const typeVal = input.ready ? "__ready__" : input.type;
    const dataVal = input.ready ? "{'url':location.href,'protocol':location.protocol}" : dataExpr;
    return `import urllib.request,json
urllib.request.urlopen(urllib.request.Request('${input.url}',data=json.dumps({'sessionId':'${input.sessionId}','time':__import__('time').strftime('%H:%M:%S'),'type':'${typeVal}','data':${dataVal}}).encode(),headers={'Content-Type':'application/json'}))`;
  },
  go(input) {
    const dataExpr = input.data && input.data.trim() ? input.data : "{}";
    const typeVal = input.ready ? "__ready__" : input.type;
    const body = `{"sessionId":"${input.sessionId}","time":"TIME","type":"${typeVal}","data":${dataExpr}}`;
    return `package main
import ("bytes";"net/http")
func main(){
  body:=bytes.NewBuffer([]byte(\`${body}\`))
  http.Post("${input.url}","application/json",body)
}`;
  },
  swift(input) {
    const dataExpr = input.data && input.data.trim() ? input.data : "[:]";
    const typeVal = input.ready ? "__ready__" : input.type;
    return `var req=URLRequest(url:URL(string:"${input.url}")!)
req.httpMethod="POST"
req.setValue("application/json",forHTTPHeaderField:"Content-Type")
req.httpBody=try?JSONSerialization.data(withJSONObject:["sessionId":"${input.sessionId}","time":Date().description.prefix(8),"type":"${typeVal}","data":${dataExpr}])
URLSession.shared.dataTask(with:req).resume()`;
  },
  kotlin(input) {
    const dataExpr = input.data && input.data.trim() ? input.data : "{}";
    const typeVal = input.ready ? "__ready__" : input.type;
    return `val body="{\\"sessionId\\":\\"${input.sessionId}\\",\\"time\\":\\"\\",\\"type\\":\\"${typeVal}\\",\\"data\\":${dataExpr}}".toRequestBody("application/json".toMediaType())
val req=Request.Builder().url("${input.url}").post(body).build()
OkHttpClient().newCall(req).execute()`;
  },
  dart(input) {
    const dataExpr = input.data && input.data.trim() ? input.data : "{}";
    const typeVal = input.ready ? "__ready__" : input.type;
    return `http.post(Uri.parse('${input.url}'),headers:{'Content-Type':'application/json'},body:jsonEncode({'sessionId':'${input.sessionId}','time':DateTime.now().toString().substring(11,19),'type':'${typeVal}','data':${dataExpr}}));`;
  },
  cpp(input) {
    const dataExpr = input.data && input.data.trim() ? input.data : "{}";
    const typeVal = input.ready ? "__ready__" : input.type;
    const body = `{"sessionId":"${input.sessionId}","time":"TIME","type":"${typeVal}","data":${dataExpr}}`;
    return `CURL*curl=curl_easy_init();
curl_easy_setopt(curl,CURLOPT_URL,"${input.url}");
curl_easy_setopt(curl,CURLOPT_POST,1L);
curl_easy_setopt(curl,CURLOPT_POSTFIELDS,"${body.replace(/"/g, '\\"')}");
struct curl_slist*h=curl_slist_append(NULL,"Content-Type: application/json");
curl_easy_setopt(curl,CURLOPT_HTTPHEADER,h);
curl_easy_perform(curl);
curl_easy_cleanup(curl);`;
  },
  rust(input) {
    const dataExpr = input.data && input.data.trim() ? input.data : "serde_json::json!({})";
    const typeVal = input.ready ? "__ready__" : input.type;
    return `reqwest::blocking::Client::new()
  .post("${input.url}")
  .json(&serde_json::json!({"sessionId":"${input.sessionId}","time":"","type":"${typeVal}","data":${dataExpr}}))
  .send()?;`;
  },
  java(input) {
    const dataExpr = input.data && input.data.trim() ? input.data : "{}";
    const typeVal = input.ready ? "__ready__" : input.type;
    const body = `{"sessionId":"${input.sessionId}","time":"","type":"${typeVal}","data":${dataExpr}}`;
    return `var body="${body.replace(/"/g, '\\"')}";
var req=HttpRequest.newBuilder()
  .uri(URI.create("${input.url}"))
  .header("Content-Type","application/json")
  .POST(HttpRequest.BodyPublishers.ofString(body))
  .build();
HttpClient.newHttpClient().send(req,HttpResponse.BodyHandlers.ofString());`;
  },
  csharp(input) {
    const dataExpr = input.data && input.data.trim() ? input.data : "new{}";
    const typeVal = input.ready ? "__ready__" : input.type;
    return `var body=JsonSerializer.Serialize(new{sessionId="${input.sessionId}",time=DateTime.Now.ToString("HH:mm:ss"),type="${typeVal}",data=${dataExpr}});
await new HttpClient().PostAsync("${input.url}",new StringContent(body,Encoding.UTF8,"application/json"));`;
  },
  php(input) {
    const dataExpr = input.data && input.data.trim() ? input.data : "[]";
    const typeVal = input.ready ? "__ready__" : input.type;
    return `$ch=curl_init("${input.url}");
curl_setopt($ch,CURLOPT_POST,true);
curl_setopt($ch,CURLOPT_POSTFIELDS,json_encode(['sessionId'=>"${input.sessionId}",'time'=>date('H:i:s'),'type'=>"${typeVal}",'data'=>${dataExpr}]));
curl_setopt($ch,CURLOPT_HTTPHEADER,['Content-Type: application/json']);
curl_exec($ch);
curl_close($ch);`;
  },
  ruby(input) {
    const dataExpr = input.data && input.data.trim() ? input.data : "{}";
    const typeVal = input.ready ? "__ready__" : input.type;
    return `require 'net/http'
require 'json'
uri=URI("${input.url}")
Net::HTTP.post(uri,{sessionId:"${input.sessionId}",time:Time.now.strftime("%H:%M:%S"),type:"${typeVal}",data:${dataExpr}}.to_json,"Content-Type"=>"application/json")`;
  }
};
const SUPPORTED_LANGS = Object.keys(renderers);
function renderLog(input) {
  const fn = renderers[input.lang.toLowerCase()];
  if (!fn) {
    throw new Error(
      `Unsupported language: ${input.lang}. Supported: ${SUPPORTED_LANGS.join(", ")}`
    );
  }
  return fn(input);
}

function newSessionId() {
  return "sess_" + crypto.randomBytes(4).toString("hex");
}
function generate(opts) {
  const lang = opts.lang.toLowerCase();
  if (!SUPPORTED_LANGS.includes(lang)) {
    throw new Error(
      `Unsupported language: ${opts.lang}. Supported: ${SUPPORTED_LANGS.join(", ")}`
    );
  }
  return renderLog({
    lang,
    url: opts.url || "http://localhost:7331",
    sessionId: opts.sessionId || newSessionId(),
    type: opts.ready ? "__ready__" : opts.type || "state",
    data: opts.data,
    ready: opts.ready
  });
}

const cli = cac("@dev-log/cli");
const CMD = "npx @dev-log/cli";
const VERSION = (() => {
  try {
    const dir = typeof __dirname !== "undefined" ? __dirname : (() => {
      const { fileURLToPath: fileURLToPath2 } = require("url");
      const { dirname } = require("path");
      return dirname(fileURLToPath2((typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('cli.cjs', document.baseURI).href))));
    })();
    for (const candidate of [dir, dir + "/..", dir + "/../.."]) {
      try {
        const pkg = require(candidate + "/package.json");
        if (pkg.version) return pkg.version;
      } catch {
      }
    }
  } catch {
  }
  return "0.0.0";
})();
const IS_DAEMON = process.env.DEV_LOG_DAEMON === "1";
const ENTRY_FILE = (() => {
  try {
    return require$$0$2.fileURLToPath((typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('cli.cjs', document.baseURI).href)));
  } catch {
    return process.argv[1];
  }
})();
function probeHealth() {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${PORT}/health`, (res) => {
      resolve(res.statusCode === 200);
      res.resume();
    });
    req.on("error", () => resolve(false));
    req.setTimeout(1e3, () => {
      req.destroy();
      resolve(false);
    });
  });
}
async function waitForDaemon() {
  for (let i = 0; i < 50; i++) {
    if (await probeHealth()) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}
cli.command("start", "Start the log server (port 7331) as a background daemon").action(async () => {
  if (IS_DAEMON) {
    resetLogs();
    writePid();
    const localIP2 = getLocalIP();
    addresses.local = `http://localhost:${PORT}`;
    if (localIP2) addresses.network = `http://${localIP2}:${PORT}`;
    const server = createServer();
    server.listen(PORT, () => {
    });
    server.on("error", (err) => {
      console.error(`error: ${err.message}`);
      removePid();
      process.exit(1);
    });
    const shutdown = () => {
      removePid();
      process.exit(0);
    };
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
    return;
  }
  if (await isRunning()) {
    console.log(`dev-log already running on port ${PORT}.`);
    return;
  }
  const isTsSource = ENTRY_FILE.endsWith(".ts");
  let runner;
  let runnerArgs;
  if (isTsSource) {
    const { existsSync } = await import('fs');
    const path = await import('path');
    const tsxBin = path.join(process.cwd(), "node_modules", ".bin", "tsx");
    runner = existsSync(tsxBin) ? tsxBin : "npx";
    runnerArgs = existsSync(tsxBin) ? [ENTRY_FILE, "start"] : ["tsx", ENTRY_FILE, "start"];
  } else {
    runner = process.execPath;
    runnerArgs = [ENTRY_FILE, "start"];
  }
  const child = child_process.spawn(runner, runnerArgs, {
    env: { ...process.env, DEV_LOG_DAEMON: "1" },
    detached: true,
    stdio: "ignore"
  });
  child.unref();
  const up = await waitForDaemon();
  if (!up) {
    console.error("error: server failed to start within 5s.");
    process.exit(1);
  }
  const localIP = getLocalIP();
  console.log(`dev-log listening on http://localhost:${PORT}`);
  if (localIP) console.log(`            network:  http://${localIP}:${PORT}`);
  console.log(`            stop with: ${CMD} stop`);
});
cli.command("gen", "Generate a paste-ready log statement").option("--lang <lang>", "Target language (js, ts, python, go, swift, kotlin, dart, cpp, rust, java, csharp, php, ruby)", { default: "js" }).option("--type <type>", "Log type (state, error, validation, click, ...)", { default: "state" }).option("--data <expr>", "Data payload expression in the target language").option("--ready", "Emit a __ready__ connectivity probe instead of a business log").option("--session <id>", "Reuse a sessionId (default: generate a new sess_xxxxxxxx)").option("--url <url>", "Endpoint URL", { default: `http://localhost:${PORT}` }).action((opts) => {
  try {
    const code = generate({
      lang: opts.lang,
      type: opts.type,
      data: opts.data,
      ready: opts.ready === true,
      sessionId: opts.session,
      url: opts.url
    });
    process.stdout.write(code + "\n");
  } catch (e) {
    console.error(`error: ${e.message}`);
    process.exit(1);
  }
});
cli.command("logs", "Read collected logs").option("--session <id>", "Filter by sessionId").action((opts) => {
  const logs = readLogs(opts.session);
  process.stdout.write(JSON.stringify(logs, null, 2) + "\n");
});
cli.command("clear", "Clear logs").option("--session <id>", "Clear only this session (omit for all)").action((opts) => {
  const result = clearLogs(opts.session);
  console.log(
    opts.session ? `cleared ${result.deleted} log(s) for session ${opts.session}` : "cleared all logs"
  );
});
cli.command("tunnel", "Start an HTTPS tunnel to the running server").action(async () => {
  if (!await isRunning()) {
    console.error(`error: server is not running. Start it first: ${CMD} start`);
    process.exit(1);
  }
  try {
    const url = await startTunnel();
    addresses.tunnel = url;
    console.log(url);
  } catch (e) {
    console.error(`error: failed to start tunnel: ${e.message}`);
    process.exit(1);
  }
});
cli.command("status", "Show server status").action(async () => {
  const alive = await probeHealth();
  const pid = readPid();
  if (!alive) {
    console.log(JSON.stringify({ running: false, port: PORT }, null, 2));
    if (pid) {
      removePid();
    }
    return;
  }
  const logs = readLogs();
  const sessions = new Set(logs.map((l) => l.sessionId));
  console.log(
    JSON.stringify(
      {
        running: true,
        port: PORT,
        pid,
        local: `http://localhost:${PORT}`,
        network: addresses.network,
        tunnel: addresses.tunnel,
        logCount: logs.length,
        activeSessions: sessions.size
      },
      null,
      2
    )
  );
});
cli.command("stop", "Stop the running server").action(async () => {
  const pid = readPid();
  if (!pid) {
    if (await isRunning()) {
      console.log(`server is running but PID file is missing. Port ${PORT} is occupied; kill it manually if needed.`);
    } else {
      console.log("no dev-log server running.");
    }
    return;
  }
  try {
    process.kill(pid, "SIGTERM");
  } catch (e) {
    removePid();
    console.log("no dev-log server running (cleaned up stale PID file).");
    return;
  }
  let dead = false;
  for (let i = 0; i < 30; i++) {
    try {
      process.kill(pid, 0);
    } catch {
      dead = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  if (!dead) {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
    }
  }
  removePid();
  console.log(`stopped dev-log (pid ${pid})`);
});
cli.help();
cli.version(VERSION);
const inputArgs = process.argv.slice(2);
const firstArg = inputArgs.find((a) => !a.startsWith("-"));
const hasHelpOrVersion = inputArgs.some((a) => a === "--help" || a === "-h" || a === "--version" || a === "-v");
if (hasHelpOrVersion) {
  cli.parse();
} else {
  cli.parse(process.argv, { run: false });
  if (!firstArg) {
    cli.outputHelp();
    process.exit(0);
  }
  const knownCommands = ["start", "gen", "logs", "clear", "tunnel", "status", "stop"];
  if (!knownCommands.includes(firstArg)) {
    console.error(`error: unknown command "${firstArg}". Run "${CMD} --help" for the list.`);
    process.exit(1);
  }
  try {
    cli.runMatchedCommand();
  } catch (e) {
    console.error(`error: ${e.message}`);
    console.error(`Run "${CMD} --help" for usage.`);
    process.exit(1);
  }
}

exports.generate = generate;
exports.newSessionId = newSessionId;
