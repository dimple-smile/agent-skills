---
name: web-search
description: 从网络搜索信息并返回结果。当用户需要搜索网页、获取最新信息或查找资源时使用。
---

# Web Search

This skill enables the agent to perform web searches and retrieve current information from the internet.

## When to Use

Use this skill when the user:
- Needs recent information from the web
- Asks to search for specific resources
- Wants to verify facts online
- Requires current news or updates

## Examples

### Example 1: Searching for Information

\`\`\`markdown
User: What's the latest news about AI?

Agent: [uses web-search skill]
I found the latest AI news for you:
1. ...
2. ...
\`\`\`

### Example 2: Finding Resources

\`\`\`markdown
User: Find documentation for React hooks

Agent: [uses web-search skill]
Here are the best React hooks resources:
- Official docs: ...
- Tutorial: ...
\`\`\`

## Implementation

When using this skill:
1. Identify the core search query
2. Use web search capabilities
3. Summarize relevant results
4. Provide sources/links
