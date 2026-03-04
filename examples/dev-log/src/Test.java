import java.net.*;
import java.net.http.*;
import java.time.*;
import java.util.*;

/**
 * Dev-log Java 测试
 * 测试 HTTP 请求 + __ready__ 探测
 */
public class Test {
    public static void main(String[] args) throws Exception {
        final String port = System.getenv("PORT") != null ? System.getenv("PORT") : "3000";
        final String host = System.getenv("HOST") != null ? System.getenv("HOST") : "host.docker.internal";
        final String sessionId = "sess_java_" + (new Random().nextInt(90000000) + 10000000);

        System.out.println("=== Java 测试 (PORT=" + port + ") ===\n");

        HttpClient client = HttpClient.newHttpClient();

        // 1. 探测日志
        boolean ready = sendLog(client, host, port, sessionId, "__ready__",
            "{\"runtime\":\"java\",\"url\":\"docker://java\"}");
        if (!ready) {
            System.out.println("❌ 探测失败，无法连接 dev-log 服务");
            System.exit(1);
        }
        System.out.println("✅ 探测成功");

        // 2. 业务日志
        sendLog(client, host, port, sessionId, "state", "{\"count\":0,\"message\":\"初始化\"}");
        System.out.println("✅ 业务日志发送成功");

        System.out.println("\n✅ Java 测试通过 (sessionId: " + sessionId + ")");
    }

    static boolean sendLog(HttpClient client, String host, String port, String sessionId, String type, String dataJson) {
        try {
            String time = LocalTime.now().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm:ss"));
            String body = "{\"sessionId\":\"" + sessionId + "\",\"time\":\"" + time + "\",\"type\":\"" + type + "\",\"data\":" + dataJson + "}";
            var request = HttpRequest.newBuilder()
                .uri(URI.create("http://" + host + ":" + port))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
            client.send(request, HttpResponse.BodyHandlers.ofString());
            return true;
        } catch (Exception e) {
            System.out.println("❌ 发送失败: " + e.getMessage());
            return false;
        }
    }
}
