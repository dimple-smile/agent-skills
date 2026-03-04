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
        String port = System.getenv("PORT");
        if (port == null) port = "3000";
        String host = System.getenv("HOST");
        if (host == null) host = "host.docker.internal";
        String sessionId = "sess_java_" + (new Random().nextInt(90000000) + 10000000);

        System.out.println("=== Java 测试 (PORT=" + port + ") ===\n");

        HttpClient client = HttpClient.newHttpClient();

        // 发送日志
        var sendLog = new Object() {
            boolean apply(String type, String dataJson) {
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
        };

        // 1. 探测日志
        if (!sendLog.apply("__ready__", "{\"runtime\":\"java\",\"url\":\"docker://java\"}")) {
            System.out.println("❌ 探测失败，无法连接 dev-log 服务");
            System.exit(1);
        }
        System.out.println("✅ 探测成功");

        // 2. 业务日志
        sendLog.apply("state", "{\"count\":0,\"message\":\"初始化\"}");
        System.out.println("✅ 业务日志发送成功");

        System.out.println("\n✅ Java 测试通过 (sessionId: " + sessionId + ")");
    }
}
