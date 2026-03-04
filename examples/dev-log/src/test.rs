use reqwest::blocking::Client;
use serde_json::json;
use std::env;
use std::time::{SystemTime, UNIX_EPOCH};

fn main() {
    let port = env::var("PORT").unwrap_or_else(|_| "3000".to_string());
    let host = env::var("HOST").unwrap_or_else(|_| "host.docker.internal".to_string());
    let session_id = format!("sess_rust_{}", SystemTime::now().duration_since(UNIX_EPOCH).unwrap().subsec_nanos() % 100000000);
    let url = format!("http://{}:{}", host, port);

    println!("=== Rust 测试 (PORT={}) ===\n", port);

    let client = Client::new();

    let send_log = |log_type: &str, data: serde_json::Value| -> bool {
        let body = json!({
            "sessionId": &session_id,
            "time": chrono::Local::now().format("%H:%M:%S").to_string(),
            "type": log_type,
            "data": data
        });

        match client
            .post(&url)
            .json(&body)
            .timeout(std::time::Duration::from_secs(5))
            .send()
        {
            Ok(_) => true,
            Err(e) => {
                println!("❌ 发送失败: {}", e);
                false
            }
        }
    };

    // 1. 探测日志
    if !send_log("__ready__", json!({"runtime": "rust", "url": "docker://rust"})) {
        println!("❌ 探测失败，无法连接 dev-log 服务");
        std::process::exit(1);
    }
    println!("✅ 探测成功");

    // 2. 业务日志
    send_log("state", json!({"count": 0, "message": "初始化"}));
    println!("✅ 业务日志发送成功");

    println!("\n✅ Rust 测试通过 (sessionId: {})", session_id);
}
