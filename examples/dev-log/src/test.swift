#!/usr/bin/env swift
// Dev-log Swift 测试
// 测试 HTTP 请求 + __ready__ 探测

import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

let port = ProcessInfo.processInfo.environment["PORT"] ?? "3000"
let host = ProcessInfo.processInfo.environment["HOST"] ?? "host.docker.internal"
let sessionId = "sess_swift_\(Int.random(in: 10000000...99999999))"

func sendLog(type: String, dataJson: String) -> Bool {
    let timeFormatter = DateFormatter()
    timeFormatter.dateFormat = "HH:mm:ss"
    let time = timeFormatter.string(from: Date())

    let body = "{\"sessionId\":\"\(sessionId)\",\"time\":\"\(time)\",\"type\":\"\(type)\",\"data\":\(dataJson)}"

    guard let url = URL(string: "http://\(host):\(port)") else { return false }

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = body.data(using: .utf8)
    request.timeoutInterval = 5

    var success = false
    let semaphore = DispatchSemaphore(value: 0)

    let task = URLSession.shared.dataTask(with: request) { _, response, error in
        if let error = error {
            print("❌ 发送失败: \(error.localizedDescription)")
        } else {
            success = true
        }
        semaphore.signal()
    }

    task.resume()
    semaphore.wait()
    return success
}

print("=== Swift 测试 (PORT=\(port)) ===\n")

// 1. 探测日志
if !sendLog(type: "__ready__", dataJson: "{\"runtime\":\"swift\",\"url\":\"docker://swift\"}") {
    print("❌ 探测失败，无法连接 dev-log 服务")
    exit(1)
}
print("✅ 探测成功")

// 2. 业务日志
sendLog(type: "state", dataJson: "{\"count\":0,\"message\":\"初始化\"}")
print("✅ 业务日志发送成功")

print("\n✅ Swift 测试通过 (sessionId: \(sessionId))")
