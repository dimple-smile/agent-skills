/**
 * Dev-log C++ 测试
 * 测试 HTTP 请求 + __ready__ 探测
 */

#include <iostream>
#include <cstdlib>
#include <ctime>
#include <curl/curl.h>

int main() {
    const char* port = std::getenv("PORT");
    if (!port) port = "3000";
    const char* host = std::getenv("HOST");
    if (!host) host = "host.docker.internal";

    // 生成 session ID
    std::srand(std::time(nullptr));
    std::string sessionId = "sess_cpp_";
    for (int i = 0; i < 8; i++) {
        sessionId += "abcdefghijklmnopqrstuvwxyz0123456789"[std::rand() % 36];
    }

    std::cout << "=== C++ 测试 (PORT=" << port << ") ===\n\n";

    // 获取当前时间
    time_t now = time(nullptr);
    struct tm* tm_info = localtime(&now);
    char timeBuf[9];
    strftime(timeBuf, 9, "%H:%M:%S", tm_info);

    // 发送日志函数
    auto sendLog = [&](const char* type, const char* dataJson) -> bool {
        CURL* curl = curl_easy_init();
        if (!curl) return false;

        std::string url = std::string("http://") + host + ":" + port;
        std::string body = "{\"sessionId\":\"" + sessionId + "\",\"time\":\"" + timeBuf + "\",\"type\":\"" + type + "\",\"data\":" + dataJson + "}";

        struct curl_slist* headers = curl_slist_append(nullptr, "Content-Type: application/json");
        curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
        curl_easy_setopt(curl, CURLOPT_POST, 1L);
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, body.c_str());
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
        curl_easy_setopt(curl, CURLOPT_TIMEOUT, 5L);

        CURLcode res = curl_easy_perform(curl);
        curl_slist_free_all(headers);
        curl_easy_cleanup(curl);

        if (res != CURLE_OK) {
            std::cout << "❌ 发送失败: " << curl_easy_strerror(res) << "\n";
            return false;
        }
        return true;
    };

    // 1. 探测日志
    if (!sendLog("__ready__", "{\"runtime\":\"cpp\",\"url\":\"docker://cpp\"}")) {
        std::cout << "❌ 探测失败，无法连接 dev-log 服务\n";
        return 1;
    }
    std::cout << "✅ 探测成功\n";

    // 2. 业务日志
    sendLog("state", "{\"count\":0,\"message\":\"初始化\"}");
    std::cout << "✅ 业务日志发送成功\n";

    std::cout << "\n✅ C++ 测试通过 (sessionId: " << sessionId << ")\n";
    return 0;
}
