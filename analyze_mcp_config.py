#!/usr/bin/env python3
"""
分析Claude Code的.claude.json配置文件中不同scope的MCP服务器配置差异
"""

import json
import os
from pathlib import Path

def find_mcp_config_sections(json_data):
    """
    在JSON数据中查找所有包含MCP服务器配置的段落
    """
    mcp_sections = []

    def recursive_search(obj, path=""):
        if isinstance(obj, dict):
            # 检查是否包含mcpServers字段
            if "mcpServers" in obj:
                mcp_sections.append({
                    "path": path,
                    "mcpServers": obj["mcpServers"],
                    "context": obj
                })

            # 递归搜索
            for key, value in obj.items():
                recursive_search(value, f"{path}.{key}" if path else key)

        elif isinstance(obj, list):
            for i, item in enumerate(obj):
                recursive_search(item, f"{path}[{i}]")

    recursive_search(json_data)
    return mcp_sections

def analyze_claude_json():
    """
    分析.claude.json文件中的MCP配置
    """
    claude_json_path = Path.home() / ".claude.json"

    if not claude_json_path.exists():
        print(f"❌ 文件不存在: {claude_json_path}")
        return

    print(f"📁 分析文件: {claude_json_path}")
    print(f"📏 文件大小: {claude_json_path.stat().st_size / 1024 / 1024:.2f} MB")
    print()

    try:
        # 流式读取大型JSON文件
        with open(claude_json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # 查找所有MCP配置段落
        mcp_sections = find_mcp_config_sections(data)

        print(f"🔍 找到 {len(mcp_sections)} 个包含MCP服务器配置的段落:")
        print()

        # 分析每个段落
        for i, section in enumerate(mcp_sections, 1):
            print(f"📋 段落 {i}:")
            print(f"   路径: {section['path']}")

            mcp_servers = section['mcpServers']
            if isinstance(mcp_servers, dict) and mcp_servers:
                print(f"   MCP服务器数量: {len(mcp_servers)}")

                for server_name, server_config in mcp_servers.items():
                    print(f"   - {server_name}")
                    if isinstance(server_config, dict):
                        print(f"     类型: {server_config.get('type', 'unknown')}")
                        if 'url' in server_config:
                            print(f"     URL: {server_config['url']}")
                        if 'command' in server_config:
                            print(f"     命令: {server_config['command']}")
                    else:
                        print(f"     配置: {server_config}")
            else:
                print("   (空的MCP服务器配置)")

            print()

        # 特别查找我们刚添加的服务器
        print("🎯 查找我们刚添加的MCP服务器:")
        target_servers = ["weather-mcp-local", "github-mcp-project", "notion-mcp-user"]

        for section in mcp_sections:
            mcp_servers = section['mcpServers']
            if isinstance(mcp_servers, dict):
                for server_name in target_servers:
                    if server_name in mcp_servers:
                        print(f"✅ 找到 {server_name}:")
                        print(f"   路径: {section['path']}")
                        print(f"   配置: {mcp_servers[server_name]}")

                        # 分析上下文信息
                        context = section['context']
                        if 'projectPath' in context:
                            print(f"   项目路径: {context['projectPath']}")
                        if 'createdAt' in context:
                            print(f"   创建时间: {context['createdAt']}")
                        if 'updatedAt' in context:
                            print(f"   更新时间: {context['updatedAt']}")
                        print()

        # 分析配置结构差异
        print("🔬 分析配置结构差异:")
        local_configs = []
        user_configs = []

        for section in mcp_sections:
            mcp_servers = section['mcpServers']
            if isinstance(mcp_servers, dict):
                for server_name, server_config in mcp_servers.items():
                    if "local" in server_name or "weather-mcp-local" == server_name:
                        local_configs.append({
                            "section_path": section['path'],
                            "server_name": server_name,
                            "config": server_config,
                            "context": section['context']
                        })
                    elif "user" in server_name or "notion-mcp-user" == server_name:
                        user_configs.append({
                            "section_path": section['path'],
                            "server_name": server_name,
                            "config": server_config,
                            "context": section['context']
                        })

        print(f"📍 Local scope配置数量: {len(local_configs)}")
        for config in local_configs:
            print(f"   - {config['server_name']} 在路径: {config['section_path']}")

        print(f"🌐 User scope配置数量: {len(user_configs)}")
        for config in user_configs:
            print(f"   - {config['server_name']} 在路径: {config['section_path']}")

        # 显示存储结构的详细信息
        if local_configs or user_configs:
            print("\n📊 详细存储结构分析:")
            for config in local_configs + user_configs:
                print(f"\n服务器: {config['server_name']}")
                print(f"存储路径: {config['section_path']}")

                # 分析上下文键
                context_keys = list(config['context'].keys())
                print(f"上下文包含的键: {context_keys}")

                # 查找allowedTools
                if 'allowedTools' in config['context']:
                    allowed_tools = config['context']['allowedTools']
                    print(f"allowedTools: {allowed_tools}")
                    if isinstance(allowed_tools, list):
                        print(f"  - 包含 {len(allowed_tools)} 个工具")
                        for tool in allowed_tools[:5]:  # 只显示前5个
                            print(f"    • {tool}")
                        if len(allowed_tools) > 5:
                            print(f"    ... 还有 {len(allowed_tools) - 5} 个工具")

                # 查找项目特定信息
                if 'projectPath' in config['context']:
                    print(f"关联项目路径: {config['context']['projectPath']}")

                # 查找时间戳
                time_keys = ['createdAt', 'updatedAt', 'lastUsed']
                for key in time_keys:
                    if key in config['context']:
                        print(f"{key}: {config['context'][key]}")

        # 专门分析allowedTools的分布
        print("\n🔧 分析allowedTools在所有配置位置的分布:")

        allowed_tools_sections = []
        for section in mcp_sections:
            context = section['context']
            if 'allowedTools' in context:
                allowed_tools_sections.append({
                    "path": section['path'],
                    "allowedTools": context['allowedTools'],
                    "mcpServers": section['mcpServers']
                })

        print(f"📋 找到 {len(allowed_tools_sections)} 个包含allowedTools的配置段落:")
        for i, section in enumerate(allowed_tools_sections, 1):
            print(f"\n{i}. 路径: {section['path']}")
            tools = section['allowedTools']
            if isinstance(tools, list):
                print(f"   allowedTools数量: {len(tools)}")
                if tools:
                    print(f"   工具示例: {tools[:3]}")
            else:
                print(f"   allowedTools类型: {type(tools)}")

            # 检查是否同时有MCP服务器
            mcp_servers = section['mcpServers']
            if isinstance(mcp_servers, dict) and mcp_servers:
                print(f"   同时包含MCP服务器: {list(mcp_servers.keys())}")

        # 特别检查根级别的allowedTools
        print("\n🌐 检查根级别(User Scope)的allowedTools:")
        root_section = None
        for section in mcp_sections:
            if section['path'] == "":
                root_section = section
                break

        if root_section:
            context = root_section['context']
            if 'allowedTools' in context:
                tools = context['allowedTools']
                print(f"✅ 根级别包含allowedTools: {len(tools) if isinstance(tools, list) else 'N/A'} 个工具")
                if isinstance(tools, list) and tools:
                    print(f"   示例工具: {tools[:5]}")
            else:
                print("❌ 根级别不包含allowedTools")
        else:
            print("❌ 未找到根级别配置")

        # 检查.mcp.json文件中是否有allowedTools
        project_mcp_file = Path.cwd() / ".mcp.json"
        print(f"\n📁 检查项目级.mcp.json文件: {project_mcp_file}")
        if project_mcp_file.exists():
            with open(project_mcp_file, 'r', encoding='utf-8') as f:
                project_config = json.load(f)
                print("✅ .mcp.json文件内容:")
                print(json.dumps(project_config, indent=2, ensure_ascii=False))

                if 'allowedTools' in project_config:
                    tools = project_config['allowedTools']
                    print(f"✅ .mcp.json包含allowedTools: {len(tools) if isinstance(tools, list) else 'N/A'} 个工具")
                else:
                    print("❌ .mcp.json不包含allowedTools")
        else:
            print("❌ .mcp.json文件不存在")

    except json.JSONDecodeError as e:
        print(f"❌ JSON解析错误: {e}")
    except Exception as e:
        print(f"❌ 分析过程中出现错误: {e}")

if __name__ == "__main__":
    analyze_claude_json()