// Dev-log C# 测试
// 测试 HTTP 请求 + __ready__ 探测

using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;

class Test
{
    static async Task Main()
    {
        var port = Environment.GetEnvironmentVariable("PORT") ?? "3000";
        var host = Environment.GetEnvironmentVariable("HOST") ?? "host.docker.internal";
        var sessionId = "sess_csharp_" + Random.Shared.Next(10000000, 99999999);

        Console.WriteLine($"=== C# 测试 (PORT={port}) ===\n");

        var client = new HttpClient { Timeout = TimeSpan.FromSeconds(5) };

        async Task<bool> SendLog(string type, object data)
        {
            var logEntry = new { sessionId, time = DateTime.Now.ToString("HH:mm:ss"), type, data };
            var json = JsonSerializer.Serialize(logEntry);
            try
            {
                await client.PostAsync($"http://{host}:{port}", new StringContent(json, Encoding.UTF8, "application/json"));
                return true;
            }
            catch (Exception e)
            {
                Console.WriteLine($"❌ 发送失败: {e.Message}");
                return false;
            }
        }

        // 1. 探测日志
        if (!await SendLog("__ready__", new { runtime = "csharp", url = "docker://csharp" }))
        {
            Console.WriteLine("❌ 探测失败，无法连接 dev-log 服务");
            Environment.Exit(1);
        }
        Console.WriteLine("✅ 探测成功");

        // 2. 业务日志
        await SendLog("state", new { count = 0, message = "初始化" });
        Console.WriteLine("✅ 业务日志发送成功");

        Console.WriteLine($"\n✅ C# 测试通过 (sessionId: {sessionId})");
    }
}
