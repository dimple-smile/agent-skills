package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

var PORT string
var HOST string
var SESSION_ID string

func init() {
	PORT = os.Getenv("PORT")
	if PORT == "" {
		PORT = "3000"
	}
	HOST = os.Getenv("HOST")
	if HOST == "" {
		HOST = "host.docker.internal"
	}
	SESSION_ID = fmt.Sprintf("sess_go_%d", time.Now().UnixNano()%100000000)
}

func sendLog(logType string, data map[string]interface{}) bool {
	body, _ := json.Marshal(map[string]interface{}{
		"sessionId": SESSION_ID,
		"time":      time.Now().Format("15:04:05"),
		"type":      logType,
		"data":      data,
	})

	req, _ := http.NewRequest("POST", fmt.Sprintf("http://%s:%s", HOST, PORT), bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("❌ 发送失败: %v\n", err)
		return false
	}
	defer resp.Body.Close()
	io.Copy(io.Discard, resp.Body)
	return true
}

func main() {
	fmt.Printf("=== Go 测试 (PORT=%s) ===\n\n", PORT)

	// 1. 探测日志
	if !sendLog("__ready__", map[string]interface{}{"runtime": "go", "url": "docker://go"}) {
		fmt.Println("❌ 探测失败，无法连接 dev-log 服务")
		os.Exit(1)
	}
	fmt.Println("✅ 探测成功")

	// 2. 业务日志
	sendLog("state", map[string]interface{}{"count": 0, "message": "初始化"})
	fmt.Println("✅ 业务日志发送成功")

	fmt.Printf("\n✅ Go 测试通过 (sessionId: %s)\n", SESSION_ID)
}
