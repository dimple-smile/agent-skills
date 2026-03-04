// Dev-log Kotlin 测试
// 测试 HTTP 请求 + __ready__ 探测

import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import kotlin.random.Random

fun main() {
    val port = System.getenv("PORT") ?: "3000"
    val host = System.getenv("HOST") ?: "host.docker.internal"
    val sessionId = "sess_kt_${Random.nextInt(10000000, 99999999)}"

    println("=== Kotlin 测试 (PORT=$port) ===\n")

    val client = HttpClient.newBuilder()
        .connectTimeout(java.time.Duration.ofSeconds(5))
        .build()

    fun sendLog(type: String, dataJson: String): Boolean {
        val time = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss"))
        val body = """{"sessionId":"$sessionId","time":"$time","type":"$type","data":$dataJson}"""

        val request = HttpRequest.newBuilder()
            .uri(URI.create("http://$host:$port"))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .timeout(java.time.Duration.ofSeconds(5))
            .build()

        return try {
            client.send(request, HttpResponse.BodyHandlers.ofString())
            true
        } catch (e: Exception) {
            println("❌ 发送失败: ${e.message}")
            false
        }
    }

    // 1. 探测日志
    if (!sendLog("__ready__", """{"runtime":"kotlin","url":"docker://kotlin"}""")) {
        println("❌ 探测失败，无法连接 dev-log 服务")
        return
    }
    println("✅ 探测成功")

    // 2. 业务日志
    sendLog("state", """{"count":0,"message":"初始化"}""")
    println("✅ 业务日志发送成功")

    println("\n✅ Kotlin 测试通过 (sessionId: $sessionId)")
}
