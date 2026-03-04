#!/usr/bin/env ruby
# Dev-log Ruby 测试
# 测试 HTTP 请求 + __ready__ 探测

require 'net/http'
require 'json'
require 'securerandom'

port = ENV['PORT'] || '3000'
host = ENV['HOST'] || 'host.docker.internal'
session_id = 'sess_rb_' + SecureRandom.alphanumeric(8)

def send_log(host, port, session_id, type, data)
  body = {
    sessionId: session_id,
    time: Time.now.strftime('%H:%M:%S'),
    type: type,
    data: data
  }.to_json

  uri = URI("http://#{host}:#{port}")
  http = Net::HTTP.new(uri.host, uri.port)
  http.read_timeout = 5

  request = Net::HTTP::Post.new(uri.request_uri, 'Content-Type' => 'application/json')
  request.body = body

  begin
    http.request(request)
    true
  rescue => e
    puts "❌ 发送失败: #{e.message}"
    false
  end
end

puts "=== Ruby 测试 (PORT=#{port}) ==="
puts

# 1. 探测日志
unless send_log(host, port, session_id, '__ready__', { runtime: 'ruby', url: 'docker://ruby' })
  puts '❌ 探测失败，无法连接 dev-log 服务'
  exit 1
end
puts '✅ 探测成功'

# 2. 业务日志
send_log(host, port, session_id, 'state', { count: 0, message: '初始化' })
puts '✅ 业务日志发送成功'

puts
puts "✅ Ruby 测试通过 (sessionId: #{session_id})"
