# Dev-log R 测试
# 测试 HTTP 请求 + __ready__ 探测

library(httr)

port <- Sys.getenv("PORT", "3000")
host <- Sys.getenv("HOST", "host.docker.internal")
session_id <- paste0("sess_r_", floor(runif(1, 10000000, 99999999)))
url <- paste0("http://", host, ":", port)

cat("=== R 测试 (PORT=", port, ") ===\n\n", sep = "")

send_log <- function(log_type, data_json) {
  time_str <- format(Sys.time(), "%H:%M:%S")
  body <- paste0(
    '{"sessionId":"', session_id, '",
    "time":"', time_str, '",
    "type":"', log_type, '",
    "data":', data_json, '}'
  )

  tryCatch({
    response <- POST(
      url,
      body = body,
      add_headers("Content-Type" = "application/json"),
      timeout(5)
    )
    return(status_code(response) == 200)
  }, error = function(e) {
    cat("❌ 发送失败:", e$message, "\n")
    return(FALSE)
  })
}

# 1. 探测日志
if (!send_log("__ready__", '{"runtime":"r","url":"docker://r"}')) {
  cat("❌ 探测失败，无法连接 dev-log 服务\n")
  quit(status = 1)
}
cat("✅ 探测成功\n")

# 2. 业务日志
send_log("state", '{"count":0,"message":"初始化"}')
cat("✅ 业务日志发送成功\n")

cat("\n✅ R 测试通过 (sessionId:", session_id, ")\n", sep = "")
