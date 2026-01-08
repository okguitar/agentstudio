# AgentStudio User Manual

> AgentStudio - Intelligent Agent Workspace | A modern personal AI agent platform built on Claude Code SDK

## Table of Contents

1. [Introduction](#introduction)
2. [Quick Start](#quick-start)
3. [Homepage Overview](#homepage-overview)
4. [Dashboard](#dashboard)
5. [Project Management](#project-management)
   - [Create Project](#create-project)
   - [Import Project](#import-project)
   - [Project Memory Management](#project-memory-management)
   - [Project Command Management](#project-command-management)
   - [Project Sub-Agent Management](#project-sub-agent-management)
   - [A2A Protocol Management](#a2a-protocol-management)
6. [Agent Management](#agent-management)
   - [Create Agent](#create-agent)
   - [System Prompt Configuration](#system-prompt-configuration)
   - [Tool Selection](#tool-selection)
   - [Edit Agent](#edit-agent)
7. [MCP Services](#mcp-services)
   - [Add MCP Service](#add-mcp-service)
   - [Import from Claude Code](#import-from-claude-code)
8. [Skills Management](#skills-management)
   - [Create Skill](#create-skill)
   - [View Skill Details](#view-skill-details)
   - [Browse Skill Files](#browse-skill-files)
9. [Plugin Management](#plugin-management)
   - [Add Marketplace](#add-marketplace)
   - [Browse and Install Plugins](#browse-and-install-plugins)
10. [Custom Commands](#custom-commands)
    - [Create Command](#create-command)
11. [Chat Interface](#chat-interface)
    - [Sending Messages](#sending-messages)
    - [Tool Selection](#tool-selection-1)
    - [Session History](#session-history)
    - [Chat Settings](#chat-settings)
12. [System Settings](#system-settings)
    - [Look and Feel](#look-and-feel)
    - [Supplier Management](#supplier-management)
    - [Global Memory](#global-memory)

---

## Introduction

AgentStudio is a modern personal AI agent platform built on Claude Code SDK. Through an intuitive web interface, you can easily access powerful AI capabilities to enhance your productivity.

### Core Features

- **Modern Web Interface**: Professional and intuitive Web UI with real-time streaming responses and split-screen layout
- **Multi-Model Support**: Support for Claude, GLM, DeepSeek, Kimi K2, MiniMax, and other large language models
- **Agent System**: Built-in professional agents with support for custom agent creation
- **File Management**: Built-in file browser with project-aware operations, image upload, and content preview
- **Professional Tools**: Slide agent, code explorer, document outline, and other professional tools
- **Secure & Reliable**: Environment variable protection for API keys, sandbox file system access

---

## Quick Start

### Method 1: One-Click Installation (Recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/okguitar/agentstudio/main/scripts/remote-install.sh | bash
```

### Method 2: Source Code Deployment

```bash
git clone https://github.com/okguitar/agentstudio.git
cd agentstudio
pnpm install && pnpm run dev
```

After installation, visit `http://localhost:3000` in your browser to get started.

---

## Homepage Overview

The homepage is the portal page of AgentStudio, showcasing the core value and quick entry points.

![Homepage](../.playwright-mcp/en-01-homepage.png)

### Page Elements

1. **Top Navigation Bar**
   - AgentStudio brand logo
   - "Enter Workspace" button: Quick access to the main workspace

2. **Main Tagline Area**
   - "Intelligent Agent Workspace, Let AI Be Your Capable Assistant"
   - Product introduction description

3. **Core Features Display**
   - Modern Web Interface
   - Multi-Model Support
   - Agent System
   - File Management
   - Professional Tools
   - Secure & Reliable

4. **Quick Start Guide**
   - One-click installation command for regular users
   - Source code deployment command for developers

5. **Call to Action**
   - "Get Started" button
   - GitHub source code link

### Usage Guide

1. Click the **"Enter Workspace"** button in the top right to enter the main workspace
2. Or click **"Get Started"** button to begin using
3. Click **"View Source"** to access the GitHub repository

---

## Dashboard

The dashboard is the first page you see after logging in, providing a global view of your work status.

![Dashboard](../.playwright-mcp/en-02-dashboard.png)

### Page Layout

1. **Left Navigation Bar**
   - Dashboard
   - Projects
   - MCP Services
   - Skills
   - Plugins
   - Agents
   - Commands
   - Subagents
   - Settings

2. **Statistics Cards**
   - **Agent Management**: Shows enabled/total agent count
   - **Work Projects**: Shows total number of work projects
   - **Slash Commands**: Shows number of custom commands
   - **Active Sessions**: Shows currently active conversation sessions

3. **Active Sessions Panel**
   - Shows currently ongoing conversations
   - Refresh button to update session status

4. **Recent Activity**
   - Shows recently accessed projects
   - Shows recently used commands
   - Click to quickly navigate

5. **Frequently Used Assistants**
   - Basic Agent: Simple agent without Claude Code prompt
   - Claude Code: System default assistant
   - PPT Editor: Specialized for creating and editing HTML presentations

6. **Quick Actions**
   - Create New Project
   - Create New Assistant
   - Add MCP Service

### Usage Guide

1. Click statistics cards to quickly navigate to the corresponding management page
2. In the "Frequently Used Assistants" area, click the lightning icon to enter a conversation directly
3. In the "Recent Activity" area, click a project to quickly switch
4. Use "Quick Actions" cards to quickly create new content

---

## Project Management

The project management page is used to manage all work projects, where each project corresponds to a working directory.

![Project Management Overview](../.playwright-mcp/en-project-list-overview.png)

### Page Features

1. **Search Box**: Quick search for project names

2. **Import Project**: Import an existing project directory

3. **Create New Project**: Create a new work project

4. **Project List Table**
   - **Project Name**: Click to expand project details, with an "Open" button beside it
   - **Assistant**: Default assistant assigned to the project, switchable via dropdown menu
   - **Path**: Project file system path
   - **Created**: Project creation date
   - **Last Active**: Last access time

5. **Project Action Buttons**
   - 📋 **Memory Management**: Manage project-level memory
   - ⌘ **Command Management**: Manage project-specific custom commands
   - 🤖 **Sub-Agent Management**: Manage project sub-agents
   - 🔗 **A2A Protocol Management**: Configure Agent-to-Agent protocol
   - 🗑️ **Delete**: Delete project (use with caution)

---

### Create Project

Click the **"Create New Project"** button in the top right to open the create project dialog:

![Create Project Dialog](../.playwright-mcp/en-create-project-dialog.png)

#### Steps

1. **Enter Project Name**
   - Enter the project's display name in the "Project Name" input field
   - The name should be concise and easy to identify

2. **Select Project Path**
   - Click "Browse Directory" button to open the file selector
   - Select the project directory path
   - Or directly enter the full path in the input field

3. **Select Default Assistant**
   - Select the default AI assistant for this project from the dropdown menu
   - Options include: Claude Code, Basic Agent, PPT Editor, etc.

4. **Click "Create" Button**
   - After confirming the information is correct, click create
   - The project will immediately appear in the project list

#### Notes

- Project path must be a valid file system directory
- Only one project can be created for the same path
- The default assistant can be changed at any time after creation

---

### Import Project

For existing project directories, you can quickly add them using the import feature:

#### Steps

1. **Click "Import Project" Button**
   - Located in the top right corner, next to the search box

2. **Browse and Select Project Directory**
   - In the popup dialog, click "Browse Directory"
   - Select the project folder to import
   - Or directly enter the full path

3. **Confirm Import**
   - The system will automatically recognize project information
   - Click "Import" button to complete the operation

4. **Select Default Assistant (Optional)**
   - After import, you can assign a default assistant in the project list

---

### Project Memory Management

Each project can have independent memory settings to help AI assistants better understand the project context:

#### Features

- **Memory Content Source**: Reads from the `CLAUDE.md` file in the project directory
- **Auto Load**: Automatically loads project memory for AI during each conversation
- **Edit Feature**: Can directly edit memory content in the interface
- **Refresh Feature**: Reload the latest content from the file

#### Steps

1. **Open Memory Management**
   - Click the 📋 (memory) icon on the project row in the project list

2. **View Current Memory**
   - The dialog will display the current project's memory content
   - Content is presented in Markdown format

3. **Edit Memory**
   - Click "Edit" button to enter edit mode
   - Save after modifying content

4. **Refresh Content**
   - Click "Refresh" button to reload from file

#### Suggested Content

- Project introduction and goals
- Tech stack description
- Coding standards and preferences
- Common commands and scripts
- Project structure description

---

### Project Command Management

Configure project-specific custom commands:

#### Features

- **Project-Specific Commands**: Slash commands only available in this project
- **Command List**: Shows all configured commands
- **Create New Command**: Add new project commands
- **Edit/Delete**: Manage existing commands

#### Steps

1. **Open Command Management**
   - Click the ⌘ (command) icon on the project row in the project list

2. **View Command List**
   - The dialog shows all custom commands for this project
   - Each command shows name and description

3. **Create New Command**
   - Click "New Command" button
   - Fill in command name (starting with /)
   - Write command prompt
   - Select available tools
   - Save command

4. **Edit/Delete Command**
   - Click the edit icon on the command row to modify
   - Click the delete icon to remove the command

---

### Project Sub-Agent Management

Manage sub-agent configurations available in the project:

#### Features

- **Sub-Agent List**: Shows available sub-agents for the project
- **Configuration Sync**: Syncs with system Subagent management
- **Enable/Disable**: Control sub-agent availability in the project

#### Steps

1. **Open Sub-Agent Management**
   - Click the 🤖 (sub-agent) icon on the project row in the project list

2. **View Sub-Agent List**
   - The dialog shows all available sub-agents
   - Each sub-agent shows name, type, and status

3. **Enable Sub-Agent**
   - Check the sub-agents you want to use in the project
   - Click save to apply changes

4. **Add New Sub-Agent**
   - Click "Add Sub-Agent" button
   - Configure sub-agent name and type
   - Set sub-agent parameters

---

### A2A Protocol Management

A2A (Agent-to-Agent) protocol management is used to configure communication and collaboration between agents:

#### Feature Overview

A2A protocol allows interoperability between different agents, supporting:
- Publishing project agent services for external calls
- Configuring API keys for authentication
- Managing external agent connections
- Monitoring agent task execution status

#### Overview Tab

The overview page shows basic information about the project's A2A service:
- **Service Name**: Current project's service identifier
- **Service Description**: Service functionality description
- **Endpoint URL**: Service access address
- **Status Indicator**: Whether the service is running

#### API Key Management

The API Keys tab is used to manage service authentication:

1. **Create API Key**
   - Click "Create Key" button
   - Set key name and validity period
   - Save the generated key (shown only once)

2. **Manage Keys**
   - View list of created keys
   - Disable or delete unused keys

3. **Security Recommendations**
   - Rotate API keys regularly
   - Use different keys for different clients

#### External Agent Management

The External Agents tab is used to configure connections to external agent services:

1. **Add External Agent**
   - Click "Add External Agent" button
   - Fill in the agent's endpoint URL
   - Configure authentication information (API key)

2. **Test Connection**
   - Verify external agent reachability
   - Get external agent capability description

3. **Use External Agent**
   - Call external agents through tool invocation in conversations
   - Support cross-project agent collaboration

#### Task Monitoring

The Tasks tab is used to monitor A2A protocol task execution:

1. **Task List**
   - Shows all tasks called through A2A
   - Includes task ID, source, status, and time

2. **Task Status**
   - pending: Waiting for execution
   - running: Currently executing
   - completed: Execution completed
   - failed: Execution failed

3. **Task Details**
   - Click task to view detailed information
   - View input parameters and execution results

---

## Agent Management

The agent management page is used to manage and configure AI assistants.

![Agent Management Overview](../.playwright-mcp/en-agent-list-overview.png)

### Page Features

1. **Search Box**: Search for assistant names

2. **Create Agent**: Create a new custom assistant

3. **Agent List**
   - **Agent**: Agent name, icon, and description
   - **Configuration**: Max rounds, permission settings
   - **Tools**: Number and list of tools the agent can use
   - **Actions**: Use, disable, edit, delete

### System Default Agent

The system has one built-in default agent **Claude Code**, which is the recommended primary work assistant:

| Agent Name | Description | Features |
|-----------|-------------|----------|
| 🔧 Claude Code | System default assistant, full-featured | 17 tools, unlimited rounds |

You can create your own custom agents as needed to meet different work scenario requirements.

---

### Create Agent

Click the **"Create Agent"** button to open the create dialog:

#### Dialog Field Descriptions

1. **Agent Name** (Required)
   - Give the agent an easily identifiable name
   - E.g.: "Code Review Assistant", "Documentation Writer"

2. **Agent Description**
   - Brief description of the agent's function and purpose
   - Helps users understand when to use this agent

3. **Icon Selection**
   - Select an icon from presets to represent the agent
   - Icons will be displayed in the agent list and chat interface

4. **Max Conversation Rounds**
   - Set the maximum rounds limit for a single conversation
   - Recommend setting appropriate value based on task complexity
   - Set to 0 for unlimited

5. **Permission Mode**
   - **Default Mode**: Standard permission settings
   - **Read-Only Mode**: Only allow read operations
   - **Full Access**: Allow all operations

6. **Enable/Disable Status**
   - Control whether the agent is available in the list

7. **System Prompt**
   - Define the agent's behavioral guidelines and professional capabilities
   - Supports two modes: **Preset** and **Custom**

#### System Prompt Configuration

The system prompt determines the agent's behavior and capabilities. AgentStudio provides two configuration methods:

**Preset Mode**

- Select "Preset" option to use the system default Claude Code prompt
- Suitable for agents that need full Claude Code functionality
- Automatically inherits all Claude Code capabilities and behavioral norms
- Recommended for new users

**Custom Mode**

- Select "Custom" option to write personalized prompts
- Full control over agent behavior and response style
- Can be written in Markdown format
- Recommended to include:
  - Role definition: Agent's identity and responsibilities
  - Capability description: Types of tasks the agent excels at
  - Response style: Output format and tone requirements
  - Limitations: Clearly state what the agent should not do

---

### Tool Selection

When creating or editing an agent, you need to select available tools:

#### Available Tool Types

**Basic Tools**:
- `Read` - Read file content
- `Write` - Write file content
- `Edit` - Edit existing files
- `MultiEdit` - Batch edit multiple files
- `Bash` - Execute shell commands
- `Glob` - File pattern matching
- `Grep` - Text search
- `LS` - List directory contents

**Advanced Tools**:
- `WebSearch` - Web search
- `WebFetch` - Fetch web page content
- `Agent` - Call sub-agents
- `TodoRead` - Read to-do items
- `TodoWrite` - Create to-do items
- `Task` - Task management

**MCP Tools**:
- Extended tools from configured MCP services
- E.g.: playwright, supabase, etc.

#### Steps

1. **Open Tool Selection**
   - Click "Select Tools" in the create/edit agent dialog

2. **Browse Available Tools**
   - Tools are displayed grouped by category
   - Each tool shows name and description

3. **Select Required Tools**
   - Click the checkbox next to a tool to enable it
   - Use the search box to quickly find tools

4. **Save Selection**
   - Click "Confirm" button to save tool configuration

---

### Edit Agent

Click the edit button in the agent list to open the edit dialog:

#### Editable Content

- Agent name and description
- Icon selection
- Max conversation rounds
- Permission mode
- Available tools list
- System prompt
- Enable/disable status

#### Steps

1. **Find Target Agent**
   - Locate the agent to edit in the agent list

2. **Click Edit Button**
   - Click the edit icon at the end of the agent row

3. **Modify Configuration**
   - Modify the fields that need to be changed in the dialog

4. **Save Changes**
   - Click "Save" button to apply changes

---

## MCP Services

The MCP (Model Context Protocol) service management page is used to configure and manage external tool servers.

![MCP Services Overview](../.playwright-mcp/en-mcp-list-overview.png)

### Page Features

1. **Search Box**: Search configuration names, commands, or arguments

2. **Import from Claude Code**: Import MCP services already configured in Claude Code

3. **Add Service**: Manually add a new MCP service

4. **Service List**
   - **Server**: Service name and type (Local/Remote)
   - **Type**: Stdio or HTTP
   - **Available Tools**: Number and list of tools provided by the service
   - **Actions**: Re-validate, copy command, edit, delete

### MCP Service Types

| Type | Description | Use Case |
|------|-------------|----------|
| Stdio | Communication via standard input/output | Local command-line tools |
| HTTP | Communication via HTTP API | Remote services or Web APIs |

---

### Add MCP Service

Click the **"Add Service"** button to open the add dialog:

![Add MCP Service Dialog](../.playwright-mcp/en-mcp-add-service.png)

#### Dialog Field Descriptions

1. **Service Name** (Required)
   - Unique identifier name for the service
   - E.g.: "playwright", "supabase"

2. **MCP Type**
   - **Stdio**: Local command-line tool
   - **HTTP**: Remote HTTP service

3. **Configuration** (JSON format)
   - Stdio type: Fill in startup command
   - HTTP type: Fill in service URL

4. **Required Fields**
   - `type`: String, MCP type ("stdio" or "http")
   - `command`: String, execution command (e.g. "npx", "uvx")
   - `args`: Array, command arguments

5. **Optional Fields**
   - `timeout`: Number, timeout in milliseconds
   - `autoApprove`: Array, auto-approve operations

#### Steps

1. **Click "Add Service"**
   - Open the service configuration dialog

2. **Fill in Basic Information**
   - Enter service name
   - Select service type

3. **Configure Startup Parameters**
   - Fill in command or URL based on service type
   - Add necessary command-line arguments

4. **Set Environment Variables** (if needed)
   - Add environment variables required for service operation

5. **Save and Validate**
   - Click "Add Configuration" button
   - The system will automatically validate the service connection

---

### Import from Claude Code

If you have already configured MCP services in Claude Code, you can automatically import them with one click:

#### Steps

1. **Click "Import from Claude Code" Button**
   - The system will automatically read Claude Code's MCP configuration file
   - Automatically find MCP Servers already configured in the system

2. **Auto Import Complete**
   - The system automatically identifies and imports all configured services
   - No manual selection needed, import completes directly
   - A success notification will be displayed after import

3. **Verify Service Status**
   - The system will automatically validate service connections after import
   - Check the service list to confirm import results

#### Notes

- You need to configure MCP services in Claude Code first
- The system will automatically read the `~/.claude/claude_desktop_config.json` configuration file
- Some services may require path configuration adjustments
- Environment variables will be imported as well

---

## Skills Management

The skills management page is used to create and manage Claude assistant skills to extend AI capabilities.

![Skills Management Overview](../.playwright-mcp/en-skills-list-overview.png)

### Page Features

1. **Search Box**: Search skill names or descriptions

2. **Create Skill**: Create a new custom skill

3. **Skill List**
   - **Skill Name**: Skill name, source (User Skill/Plugin)
   - **Tools**: Tools the skill can use
   - **Updated**: Last update date
   - **Actions**: View, browse files, edit, delete

### Skill Types

| Type Label | Description |
|-----------|-------------|
| User Skill | User-created custom skills |
| Plugin | Skills installed from plugin marketplaces |
| Local | Locally stored skill files |

---

### Create Skill

Click the **"Create Skill"** button to open the create dialog:

#### Dialog Field Descriptions

1. **Skill Name** (Required)
   - Unique identifier name for the skill
   - E.g.: "code-review", "doc-generator"

2. **Trigger Condition**
   - Define when to automatically activate this skill
   - Can use keywords or conditional expressions

3. **Skill Description**
   - Brief description of the skill's function
   - Helps AI understand when to use it

4. **Skill Instructions**
   - Detailed skill execution instructions
   - Written in Markdown format
   - Can include examples and best practices

5. **Tool Restrictions** (Optional)
   - Limit tools the skill can use
   - If not set, uses agent's default tools

#### Steps

1. **Click "Create Skill" Button**
   - Open the skill configuration dialog

2. **Fill in Basic Information**
   - Enter skill name
   - Write trigger condition

3. **Write Skill Instructions**
   - Write detailed instructions in the instruction editor
   - Include specific behavior definitions for the skill

4. **Configure Tool Restrictions** (Optional)
   - Select tools the skill can use

5. **Save Skill**
   - Click "Create" button to save

---

### View Skill Details

Click the "View" button in the skill list to view the complete skill content:

#### Detail Content

- **Skill Name and Description**
- **Trigger Condition**
- **Complete Skill Instructions**
- **Tool Restriction Configuration**
- **Creation/Update Time**

#### Action Options

- **Edit**: Modify skill configuration
- **Browse Files**: View skill-related files
- **Delete**: Delete this skill

---

### Browse Skill Files

Click the folder icon in the skill list to view the complete file structure of the skill:

![Skill File Browser](../.playwright-mcp/en-skill-file-browser.png)

#### Features

The skill file browser allows you to view the complete contents of the skill directory:

1. **File Directory Tree**
   - Shows the complete structure of the skill folder
   - Supports expand/collapse subdirectories
   - Shows file type icons

2. **File List**
   - Shows all files in the current directory
   - Shows file size and modification time

3. **File Content Preview**

![Skill File Content Preview](../.playwright-mcp/en-skill-file-preview.png)

Click a specific file to preview its content:
   - Supports code syntax highlighting
   - Supports Markdown rendering
   - Can view detailed content of skill instructions, configurations, etc.

#### Steps

1. **Open File Browser**
   - Click the 📁 (folder) icon on the skill row in the skill list

2. **Browse Directory Structure**
   - Expand the directory tree on the left to view file structure
   - Click folder to enter subdirectory

3. **View File Content**
   - Click filename to view file content
   - Content will be displayed in the right preview area

4. **Close Browser**
   - Click close button or outside the dialog to close

---

## Plugin Management

The plugin management page is used to manage plugin marketplaces and installed plugins.

![Plugin Management Overview](../.playwright-mcp/en-plugins-overview.png)

### Page Features

1. **Tab Switching**
   - **Marketplaces**: Manage plugin repository sources
   - **Browse Plugins**: Browse and install plugins

2. **Search Box**: Search marketplace names

3. **Add Marketplace**: Add a new plugin marketplace source

4. **Marketplace List**
   - Marketplace name and source type
   - Git repository address
   - Plugin count
   - Sync and delete actions

---

### Add Marketplace

Click the **"Add Marketplace"** button to add a new plugin source:

![Plugin Source Types](../.playwright-mcp/en-plugin-source-types.png)

#### Dialog Field Descriptions

1. **Marketplace Name** (Required)
   - Display name for the plugin marketplace
   - E.g.: "Official Plugin Library", "Community Plugins"

2. **Source Type** (Required)

   The system supports three plugin marketplace source types:

   | Type | Description | Use Case |
   |------|-------------|----------|
   | **GitHub** | Fetch directly from GitHub repository | Official plugin libraries, open source plugins |
   | **Git Repository** | Fetch from any Git repository | GitLab, self-hosted Git servers |
   | **Local Directory** | Load from local directory | Local development, offline environments |

3. **Repository Address/Directory Path** (Required)
   - GitHub: Enter repository URL, e.g. `https://github.com/user/plugins`
   - Git Repository: Enter complete Git repository URL
   - Local Directory: Enter absolute path of local directory

#### Steps

1. **Click "Add Marketplace" Button**
   - Open the add marketplace dialog

2. **Select Source Type**
   - Select appropriate source type from dropdown menu
   - Choose corresponding type based on your plugin source

3. **Fill in Marketplace Information**
   - Enter marketplace name
   - Enter corresponding address or path based on source type

4. **Add Marketplace**
   - Click "Add" button

5. **Sync Plugin List**
   - After adding, click "Sync" button to fetch plugins

---

### Browse and Install Plugins

Switch to the "Browse Plugins" tab to view and install available plugins:

![Browse Plugins](../.playwright-mcp/en-plugins-browse.png)

#### Features

- **Plugin List**: Shows all available plugins
- **Plugin Details**: Name, description, version information
- **Installation Status**: Shows whether installed
- **Install/Update Button**: One-click install or update

#### Steps

1. **Switch to "Browse Plugins" Tab**
   - View all available plugins

2. **Search Plugins**
   - Use search box to find specific plugins

3. **View Plugin Details**
   - Click plugin to view detailed information

4. **Install Plugin**
   - Click "Install" button to install plugin
   - After installation, plugin will be available as a skill

---

## Custom Commands

The custom commands page is used to manage Slash Commands.

![Custom Commands Overview](../.playwright-mcp/en-commands-overview.png)

### Page Features

1. **Search Box**: Search command names

2. **New Command**: Create a new custom command

3. **Command List**
   - **Command**: Command name, scope (Local/Global), parameters
   - **Model**: Model configuration used
   - **Tools**: Tools the command can use
   - **Created**: Command creation date
   - **Actions**: Edit, delete

---

### Create Command

Click the **"New Command"** button to create a custom command:

#### Dialog Field Descriptions

1. **Command Name** (Required)
   - Command name starting with `/`
   - E.g.: `/commit`, `/review`

2. **Command Description**
   - Brief description of command functionality
   - Displayed in command selection menu

3. **Parameter Definition** (Optional)
   - Define parameters the command accepts
   - Supports required and optional parameters

4. **Command Prompt**
   - Prompt template when command executes
   - Can use `$ARGUMENTS` to reference parameters

5. **Available Tools**
   - Select tools the command can use
   - Limit command's capability scope

6. **Command Scope**
   - **Global**: Available in all projects
   - **Local**: Available only in current project

#### Steps

1. **Click "New Command" Button**
   - Open the command configuration dialog

2. **Fill in Basic Information**
   - Enter command name (starting with /)
   - Write command description

3. **Define Parameters** (if needed)
   - Add command parameters
   - Set parameter type and whether required

4. **Write Prompt**
   - Write command instructions in the prompt editor
   - Use variables to reference parameters

5. **Select Tools**
   - Select tools the command can use

6. **Save Command**
   - Click "Create" button to save

#### Using Commands

In the chat interface, type `/` to trigger the command menu and select the command to execute.

---

## Chat Interface

The chat interface is the main work area for conversations with AI assistants.

![Chat Interface](../.playwright-mcp/en-chat-interface.png)

### Page Layout

1. **Top Information Bar**
   - Current assistant name and service information
   - Project name
   - New session button
   - Session history button
   - Refresh messages button

2. **Chat Area** (Left)
   - Assistant welcome message
   - Conversation history
   - Message input box

3. **File Browser** (Middle)
   - Project directory tree structure
   - Folder expand/collapse
   - File type icons
   - File size display

4. **File Preview Area** (Right)
   - Preview of selected file content
   - Supports code syntax highlighting

5. **Layout Controls**
   - Hide/show chat interface
   - Hide/show visualization interface

---

### Sending Messages

#### Input Box Features

- **Message Input**: Shift+Enter for new line, Enter to send
- **Trigger Commands**: Type `/` to trigger command menu
- **Tool Selection**: Click tool icon to select available tools
- **Image Upload**: Click image icon to upload images
- **Settings Button**: Click the bottom settings area (e.g., "GLM-4.7 | Bypass Permissions") to open detailed settings

#### Steps

1. **Enter Message**
   - Type your question or instruction in the input box

2. **Use Slash Commands**
   - Type `/` to see available commands
   - Select command and fill in parameters

3. **Send Message**
   - Press Enter or click send button

4. **Wait for Response**
   - AI will stream response in real-time
   - Can click stop button to interrupt at any time

---

### Tool Selection

Click the tool icon next to the input box to configure tools available for current conversation:

#### Features

- **Tool List**: Shows all available tools
- **Tool Categories**: Displayed grouped by type
- **Enable/Disable**: Control tool availability in current conversation
- **Temporary Settings**: Settings only apply to current conversation

#### Steps

1. **Click Tool Icon**
   - Open tool selection panel

2. **Select Tools**
   - Check tools to enable
   - Uncheck tools not needed

3. **Apply Settings**
   - Click confirm to apply changes

---

### Session History

Click the "Session History" button to view and switch historical sessions:

#### Features

- **Session List**: Shows all historical sessions
- **Session Info**: Time, message count, assistant type
- **Switch Session**: Click to switch to historical session
- **Delete Session**: Delete unwanted sessions

#### Steps

1. **Click "Session History" Button**
   - Open session history panel

2. **Browse Historical Sessions**
   - View session list
   - Each session shows time and summary

3. **Switch Session**
   - Click a session to load its content

4. **Manage Sessions**
   - Click delete button to remove session

---

### Chat Settings

Click the settings area at the bottom of the input box (showing current model and permission status, e.g., "GLM-4.7 | Bypass Permissions") to open the chat settings panel:

![Chat Settings Panel](../.playwright-mcp/en-chat-settings-panel.png)

#### Setting Options

1. **Supplier Selection**

![Supplier Selection](../.playwright-mcp/en-chat-settings-suppliers.png)

   - Select configured supplier from dropdown menu
   - Each supplier corresponds to different API configuration
   - Switching supplier automatically updates available model list

2. **Model Selection**
   - Shows available models based on selected supplier
   - Different models have different capabilities and speed characteristics
   - Takes effect immediately after selection

3. **Permission Settings**
   - **Default**: Standard permission mode
   - **Bypass Permissions**: Skip certain permission checks, suitable for advanced users
   - **Read-Only Mode**: Only allow read operations

4. **Temporary Environment Variables**
   - Add temporary environment variables for current session
   - Does not affect system configuration
   - Automatically cleared after session ends
   - Format: Key-value pairs

#### Steps

1. **Open Settings Panel**
   - Click the settings button area below the input box

2. **Select Supplier**
   - Click supplier dropdown menu
   - Select target supplier

3. **Select Model**
   - Select model to use from model dropdown menu

4. **Configure Permissions**
   - Select permission mode as needed

5. **Add Environment Variables** (Optional)
   - Click "Add Variable"
   - Enter variable name and value
   - Can add multiple variables

6. **Apply Settings**
   - Close panel after settings complete
   - New settings will apply to subsequent conversations

---

## System Settings

### Look and Feel

The look and feel settings page is used to configure interface theme and language:

![Look and Feel](../.playwright-mcp/en-settings-look-and-feel.png)

#### Theme Settings

- **Follow System**: Automatically match operating system theme
- **Light Mode**: Bright interface theme
- **Dark Mode**: Dark interface theme

#### Language Settings

- **🇨🇳 Chinese Simplified**
- **🇺🇸 English**

#### Steps

1. **Go to Look and Feel**
   - Click "Settings" → "Look & Feel" in the left navigation bar

2. **Select Theme**
   - Click the corresponding theme option

3. **Select Language**
   - Click the corresponding language option

4. **Settings Take Effect Immediately**
   - No need to save, applies immediately after selection

---

### Supplier Management

The supplier management page is used to configure multiple AI model suppliers:

![Supplier Management](../.playwright-mcp/en-settings-suppliers.png)

#### Page Features

1. **Supplier Quick Buttons**: Quickly add common suppliers
   - GLM (Zhipu AI)
   - DeepSeek
   - Kimi K2 (Moonshot AI)
   - MiniMax

2. **Supplier List**
   - Supplier name and alias
   - Path configuration
   - Environment variables
   - Supported model list

3. **Supplier Actions**
   - Copy command
   - Set as default
   - Edit configuration
   - Delete

---

#### Add Supplier

Click the **"Add Supplier"** button or quick button to add a new supplier:

##### Dialog Field Descriptions

1. **Supplier Quick Configuration Template**
   - Select preset template for quick configuration
   - Auto-fill common supplier configurations

2. **Supplier Name** (Required)
   - Display name for the supplier
   - E.g.: "Claude Code v1.2.3"

3. **Alias** (Required)
   - Unique identifier for the supplier
   - E.g.: "claude-1.2.3"

4. **Description**
   - Supplier functionality description

5. **Executable Path**
   - Path to Claude Code executable
   - Leave empty to use system default path

6. **Model Configuration**
   - Add models supported by this supplier
   - Includes: Model ID, Model Name, Is Vision Model

7. **Environment Variables**
   - Configure API address and authentication information
   - Common variables:
     - `ANTHROPIC_BASE_URL`: API base address
     - `ANTHROPIC_AUTH_TOKEN`: API authentication token

---

#### Edit Supplier

Click the edit button in the supplier list to modify supplier configuration:

##### Editable Content

- Supplier name and alias
- Description information
- Executable path
- Model configuration (add, delete, modify models)
- Environment variable configuration

##### Steps

1. **Find Target Supplier**
   - Locate in the supplier list

2. **Click Edit Button**
   - Open edit dialog

3. **Modify Configuration**
   - Update fields that need modification

4. **Save Changes**
   - Click "Update" button to apply changes

---

### Global Memory

The global memory page is used to manage cross-project shared memory content:

![Global Memory](../.playwright-mcp/en-settings-memory.png)

#### Features

- **Memory Content Source**: `~/.claude/CLAUDE.md` file
- **Auto Load**: Automatically loads during each conversation
- **Edit Feature**: Edit directly in the interface
- **Refresh Feature**: Reload from file

#### Suggested Content

- Personal information and preferences
- Commonly used tech stacks
- Coding standards
- Common configurations

#### Steps

1. **Go to Global Memory Settings**
   - Click "Settings" → "Memory" in the left navigation bar

2. **View Current Memory**
   - Page displays current global memory content

3. **Edit Memory**
   - Click "Edit" button to enter edit mode
   - Save after modifying content

4. **Refresh Content**
   - Click "Refresh" button to reload from file

---

## Keyboard Shortcuts Reference

| Shortcut | Function |
|----------|----------|
| Enter | Send message |
| Shift + Enter | New line in message |
| / | Trigger command menu |
| F8 | Open notification panel |

---

## FAQ

### Q: How do I switch between different AI models?
A: At the bottom of the chat interface, click the model name (e.g., "GLM-4.7") to switch to other configured models.

### Q: How do I add a new project directory?
A: Go to the "Projects" page and click "Create New Project" or "Import Project" button.

### Q: What if MCP service connection fails?
A: Check if the service configuration is correct, click "Re-validate" button to test connection, and check console logs for error information.

### Q: How do I backup my configuration?
A: All configurations are stored in the `~/.agent-studio` directory. Backup this directory.

---

## Technical Support

- **GitHub Issues**: [Submit Issues](https://github.com/okguitar/agentstudio/issues)
- **GitHub Discussions**: [Community Discussions](https://github.com/okguitar/agentstudio/discussions)
- **Documentation**: [Wiki Documentation](https://github.com/okguitar/agentstudio/wiki)

---

*© 2024 AgentStudio. MIT License.*

