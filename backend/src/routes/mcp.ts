import express from 'express';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const router: express.Router = express.Router();
const execAsync = promisify(exec);

// MCP configuration interface
interface McpServerConfig {
  name: string;
  type: 'stdio' | 'http';
  // For stdio type
  command?: string;
  args?: string[];
  // For http type
  url?: string;
  // Common fields
  timeout?: number;
  autoApprove?: string[];
  status?: 'active' | 'error' | 'validating';
  error?: string;
  tools?: string[];
  lastValidated?: string;
}

interface McpConfigFile {
  mcpServers: Record<string, Omit<McpServerConfig, 'name'>>;
}

// Helper function to get MCP config file path
const getMcpConfigPath = (): string => {
  return path.join(os.homedir(), '.claude-agent', 'mcp-server.json');
};

// Helper function to ensure config directory exists
const ensureConfigDirectory = (): void => {
  const configDir = path.dirname(getMcpConfigPath());
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
};

// Helper function to read MCP config
const readMcpConfig = (): McpConfigFile => {
  const configPath = getMcpConfigPath();
  
  if (!fs.existsSync(configPath)) {
    return { mcpServers: {} };
  }
  
  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Failed to read MCP config:', error);
    return { mcpServers: {} };
  }
};

// Helper function to write MCP config
const writeMcpConfig = (config: McpConfigFile): void => {
  ensureConfigDirectory();
  const configPath = getMcpConfigPath();
  
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Failed to write MCP config:', error);
    throw error;
  }
};

// Get all MCP configurations
router.get('/', (req, res) => {
  try {
    const config = readMcpConfig();
    const servers: McpServerConfig[] = Object.entries(config.mcpServers).map(([name, serverConfig]) => ({
      name,
      ...serverConfig
    }));
    
    res.json({ servers });
  } catch (error) {
    console.error('Failed to get MCP configs:', error);
    res.status(500).json({ error: 'Failed to retrieve MCP configurations' });
  }
});

// Add or update MCP configuration
router.post('/', (req, res) => {
  try {
    const { name, type, command, args, url, timeout, autoApprove } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Missing required fields: name, type' });
    }

    // Validate based on type
    if (type === 'stdio') {
      if (!command || !Array.isArray(args)) {
        return res.status(400).json({ error: 'For stdio type: command and args are required' });
      }
    } else if (type === 'http') {
      if (!url) {
        return res.status(400).json({ error: 'For http type: url is required' });
      }
    } else {
      return res.status(400).json({ error: 'Invalid type. Must be "stdio" or "http"' });
    }

    const config = readMcpConfig();

    // Create server config without name field
    const serverConfig: Omit<McpServerConfig, 'name'> = {
      type,
      ...(command && { command }),
      ...(args && { args }),
      ...(url && { url }),
      ...(timeout && { timeout }),
      ...(autoApprove && Array.isArray(autoApprove) && { autoApprove })
    };

    config.mcpServers[name] = serverConfig;
    writeMcpConfig(config);

    const responseServer: McpServerConfig = { name, ...serverConfig };
    res.json({ server: responseServer, message: 'MCP configuration saved successfully' });
  } catch (error) {
    console.error('Failed to save MCP config:', error);
    res.status(500).json({ error: 'Failed to save MCP configuration' });
  }
});

// Update MCP configuration
router.put('/:name', (req, res) => {
  try {
    const { name } = req.params;
    const { type, command, args, url, timeout, autoApprove } = req.body;

    if (!type) {
      return res.status(400).json({ error: 'Missing required field: type' });
    }

    // Validate based on type
    if (type === 'stdio') {
      if (!command || !Array.isArray(args)) {
        return res.status(400).json({ error: 'For stdio type: command and args are required' });
      }
    } else if (type === 'http') {
      if (!url) {
        return res.status(400).json({ error: 'For http type: url is required' });
      }
    } else {
      return res.status(400).json({ error: 'Invalid type. Must be "stdio" or "http"' });
    }

    const config = readMcpConfig();

    if (!config.mcpServers[name]) {
      return res.status(404).json({ error: 'MCP configuration not found' });
    }

    // Update server config
    const serverConfig: Omit<McpServerConfig, 'name'> = {
      type,
      ...(command && { command }),
      ...(args && { args }),
      ...(url && { url }),
      ...(timeout && { timeout }),
      ...(autoApprove && Array.isArray(autoApprove) && { autoApprove })
    };

    config.mcpServers[name] = serverConfig;
    writeMcpConfig(config);

    const responseServer: McpServerConfig = { name, ...serverConfig };
    res.json({ server: responseServer, message: 'MCP configuration updated successfully' });
  } catch (error) {
    console.error('Failed to update MCP config:', error);
    res.status(500).json({ error: 'Failed to update MCP configuration' });
  }
});

// Delete MCP configuration
router.delete('/:name', (req, res) => {
  try {
    const { name } = req.params;
    const config = readMcpConfig();
    
    if (!config.mcpServers[name]) {
      return res.status(404).json({ error: 'MCP configuration not found' });
    }
    
    delete config.mcpServers[name];
    writeMcpConfig(config);
    
    res.json({ success: true, message: 'MCP configuration deleted successfully' });
  } catch (error) {
    console.error('Failed to delete MCP config:', error);
    res.status(500).json({ error: 'Failed to delete MCP configuration' });
  }
});

// Validate MCP server by testing connection and getting tools
router.post('/:name/validate', async (req, res) => {
  try {
    const { name } = req.params;
    const config = readMcpConfig();

    if (!config.mcpServers[name]) {
      return res.status(404).json({ error: 'MCP configuration not found' });
    }

    const serverConfig = config.mcpServers[name];

    // Auto-detect type if not specified
    if (!serverConfig.type) {
      if (serverConfig.url) {
        serverConfig.type = 'http';
      } else if (serverConfig.command) {
        serverConfig.type = 'stdio';
      } else {
        return res.status(400).json({ error: 'Cannot determine MCP server type. Please specify type, url, or command.' });
      }

      // Update config with detected type
      config.mcpServers[name] = serverConfig;
      writeMcpConfig(config);
      console.log(`Auto-detected type for ${name}: ${serverConfig.type}`);
    }

    if (serverConfig.type === 'http') {
      // Validate HTTP MCP server
      await validateHttpMcpServer(name, serverConfig, config, res);
    } else if (serverConfig.type === 'stdio') {
      // Validate stdio MCP server
      await validateStdioMcpServer(name, serverConfig, config, res);
    } else {
      res.status(400).json({ error: 'Invalid MCP server type. Must be "stdio" or "http".' });
    }
  } catch (error) {
    console.error('Failed to validate MCP server:', error);
    res.status(500).json({
      error: 'Failed to validate MCP server',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});



// Get MCP configurations from Claude Code CLI
router.get('/claude-code', async (req, res) => {
  try {
    // Try to get MCP servers from Claude Code CLI
    const { stdout } = await execAsync('claude mcp list');

    // Parse the output to extract MCP server information
    const lines = stdout.split('\n').filter(line => line.trim());
    const servers: any[] = [];

    for (const line of lines) {
      // Look for lines that contain MCP server information
      // Format: "server-name: url (TYPE) - ✓ Connected" or "server-name: url (TYPE) - ✗ Error"
      const match = line.match(/^(.+?):\s+(.+?)\s+\((\w+)\)\s+-\s+(✓|✗)\s+(.+)$/);
      if (match) {
        const [, name, urlOrCommand, type, status, statusText] = match;

        const server: any = {
          name: name.trim(),
          type: type.toLowerCase() === 'http' ? 'http' : 'stdio',
          status: status === '✓' ? 'active' : 'error'
        };

        if (server.type === 'http') {
          server.url = urlOrCommand.trim();
        } else {
          // For stdio, we might need to parse command and args
          // This is a simplified approach
          const parts = urlOrCommand.trim().split(' ');
          server.command = parts[0];
          server.args = parts.slice(1);
        }

        if (status === '✗') {
          server.error = statusText;
        }

        servers.push(server);
      }
    }

    res.json({ servers });
  } catch (error) {
    console.error('Failed to get Claude Code MCP configurations:', error);
    res.status(500).json({
      error: 'Failed to get Claude Code MCP configurations',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;

// Validate HTTP MCP server
async function validateHttpMcpServer(name: string, serverConfig: any, config: any, res: any) {
  try {
    console.log('Validating HTTP MCP server:', serverConfig.url);

    // Test HTTP connection to MCP server
    const response = await fetch(serverConfig.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}
          },
          clientInfo: {
            name: 'claude-code-studio',
            version: '1.0.0'
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Parse SSE response
    const responseText = await response.text();
    console.log('HTTP MCP initialize response text:', responseText);

    // Extract JSON from SSE format
    let initResult: any = null;
    const lines = responseText.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          initResult = JSON.parse(line.substring(6));
          break;
        } catch (e) {
          console.warn('Failed to parse SSE data line:', line);
        }
      }
    }

    if (!initResult) {
      throw new Error('Failed to parse HTTP MCP response');
    }

    console.log('HTTP MCP initialize parsed result:', initResult);

    // Get tools from HTTP MCP server using proper session management
    let tools: string[] = [];
    console.log('Getting tools from HTTP MCP server...');

    try {
      tools = await getHttpMcpTools(serverConfig.url);
      console.log('Successfully retrieved tools from HTTP MCP:', tools);
    } catch (error) {
      console.warn('Failed to get tools from HTTP MCP server:', error);
      // Don't fail validation just because tools retrieval failed
    }

    // Update server config with successful validation
    const currentTime = new Date().toISOString();
    if (config.mcpServers[name]) {
      config.mcpServers[name] = {
        ...config.mcpServers[name],
        status: 'active',
        tools,
        lastValidated: currentTime,
        error: undefined
      };
      writeMcpConfig(config);
    }

    res.json({
      success: true,
      tools,
      message: `HTTP MCP server validated successfully. Found ${tools.length} tools.`
    });

  } catch (error) {
    console.error('HTTP MCP server validation failed:', error);

    // Update server config with error status
    const currentTime = new Date().toISOString();
    if (config.mcpServers[name]) {
      config.mcpServers[name] = {
        ...config.mcpServers[name],
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
        tools: undefined,
        lastValidated: currentTime
      };
      writeMcpConfig(config);
    }

    res.status(400).json({
      error: 'HTTP MCP server validation failed',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

// Validate stdio MCP server
async function validateStdioMcpServer(name: string, serverConfig: any, config: any, res: any) {
  if (!serverConfig.command || !serverConfig.args) {
    return res.status(400).json({ error: 'Missing command or args for stdio MCP server' });
  }

  // Start MCP server process to test connection
  console.log('Starting stdio MCP server:', serverConfig.command, serverConfig.args);
  const child = spawn(serverConfig.command, serverConfig.args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: serverConfig.timeout || 15000
  });

  let stdout = '';
  let stderr = '';
  let tools: string[] = [];

  child.stderr?.on('data', (data) => {
    const errorStr = data.toString();
    console.log('MCP stderr:', errorStr);
    stderr += errorStr;
  });

  let initializeDone = false;

  // Send initialize request to MCP server
  const initializeRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {}
      },
      clientInfo: {
        name: 'claude-code-studio',
        version: '1.0.0'
      }
    }
  };

  child.stdin?.write(JSON.stringify(initializeRequest) + '\n');

  let buffer = '';

  // Listen for stdout and parse responses in real-time
  child.stdout?.on('data', (data) => {
    const dataStr = data.toString();
    stdout += dataStr;
    buffer += dataStr;

    // Try to parse complete JSON messages
    const lines = buffer.split('\n');
    // Keep the last incomplete line in the buffer
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const response = JSON.parse(line);
        console.log('MCP response:', response);

        // Check if initialization was successful
        if (response.id === 1 && response.result && !initializeDone) {
          console.log('Initialize successful, sending initialized notification');
          initializeDone = true;

          // Send initialized notification
          const initializedNotification = {
            jsonrpc: '2.0',
            method: 'notifications/initialized'
          };
          child.stdin?.write(JSON.stringify(initializedNotification) + '\n');

          // Send tools/list request
          setTimeout(() => {
            console.log('Sending tools/list request');
            const toolsRequest = {
              jsonrpc: '2.0',
              id: 2,
              method: 'tools/list',
              params: {}
            };
            child.stdin?.write(JSON.stringify(toolsRequest) + '\n');
          }, 500);
        }

        // Handle tools/list response
        if (response.id === 2 && response.result) {
          console.log('Tools/list response received:', response.result);
          if (response.result.tools) {
            tools = response.result.tools.map((tool: any) => tool.name);
            console.log('Found tools:', tools);
          }
          // Close stdin after getting tools response (even if empty)
          setTimeout(() => child.stdin?.end(), 100);
        }
      } catch (parseError) {
        // This might be a partial JSON, continue buffering
        console.log('Parse error for line:', line.substring(0, 100) + '...');
      }
    }

    // Also try to parse the buffer as a complete JSON in case it's all one response
    if (buffer.trim()) {
      try {
        const response = JSON.parse(buffer);
        console.log('MCP buffered response:', response);

        // Handle tools/list response from buffer
        if (response.id === 2 && response.result) {
          console.log('Tools/list response received from buffer:', response.result);
          if (response.result.tools) {
            tools = response.result.tools.map((tool: any) => tool.name);
            console.log('Found tools from buffer:', tools);
          }
          // Clear buffer and close stdin
          buffer = '';
          setTimeout(() => child.stdin?.end(), 100);
        }
      } catch (parseError) {
        // Buffer is not complete JSON yet, continue
      }
    }
  });

  const timeoutId = setTimeout(() => {
    child.kill('SIGTERM');
  }, serverConfig.timeout || 10000);

  child.on('close', (code) => {
    clearTimeout(timeoutId);

    try {
      const config = readMcpConfig();
      const currentTime = new Date().toISOString();

      if (code === 0 || tools.length > 0) {
        // Update server config with successful validation
        if (config.mcpServers[name]) {
          config.mcpServers[name] = {
            ...config.mcpServers[name],
            status: 'active',
            tools,
            lastValidated: currentTime,
            error: undefined
          };
          writeMcpConfig(config);
        }

        res.json({
          success: true,
          tools,
          message: `MCP server validated successfully. Found ${tools.length} tools.`
        });
      } else {
        // Update server config with error status
        const errorMessage = `MCP server validation failed with exit code ${code}`;
        if (config.mcpServers[name]) {
          config.mcpServers[name] = {
            ...config.mcpServers[name],
            status: 'error',
            error: errorMessage,
            tools: undefined,
            lastValidated: currentTime
          };
          writeMcpConfig(config);
        }

        res.status(400).json({
          error: errorMessage,
          details: stderr || 'No error details available'
        });
      }
    } catch (configError) {
      console.error('Failed to update config with validation result:', configError);

      // Still return the validation result even if config update fails
      if (code === 0 || tools.length > 0) {
        res.json({
          success: true,
          tools,
          message: `MCP server validated successfully. Found ${tools.length} tools.`
        });
      } else {
        res.status(400).json({
          error: `MCP server validation failed with exit code ${code}`,
          details: stderr || 'No error details available'
        });
      }
    }
  });

  child.on('error', (error) => {
    clearTimeout(timeoutId);

    try {
      const config = readMcpConfig();
      if (config.mcpServers[name]) {
        config.mcpServers[name] = {
          ...config.mcpServers[name],
          status: 'error',
          error: `Failed to start MCP server: ${error.message}`,
          tools: undefined,
          lastValidated: new Date().toISOString()
        };
        writeMcpConfig(config);
      }
    } catch (configError) {
      console.error('Failed to update config with error status:', configError);
    }

    res.status(500).json({
      error: 'Failed to start MCP server',
      details: error.message
    });
  });
}

/**
 * Get tools from HTTP MCP server using proper session management
 * HTTP MCP requires maintaining session state between initialize and tools/list calls
 */
async function getHttpMcpTools(url: string): Promise<string[]> {
  console.log('Starting HTTP MCP tools discovery for:', url);

  // Step 1: Initialize the session
  const initResponse = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {}
        },
        clientInfo: {
          name: 'agentstudio-validator',
          version: '1.0.0'
        }
      }
    })
  });

  if (!initResponse.ok) {
    throw new Error(`HTTP MCP initialize failed: ${initResponse.status} ${initResponse.statusText}`);
  }

  const initResponseText = await initResponse.text();
  console.log('HTTP MCP initialize response:', initResponseText);

  // Parse initialize response
  let initResult: any = null;
  const initLines = initResponseText.split('\n');
  for (const line of initLines) {
    if (line.startsWith('data: ')) {
      try {
        initResult = JSON.parse(line.substring(6));
        break;
      } catch (e) {
        console.warn('Failed to parse init SSE data line:', line);
      }
    }
  }

  if (!initResult || !initResult.result) {
    throw new Error('Invalid initialize response from HTTP MCP server');
  }

  // Extract session ID from response headers
  const sessionId = initResponse.headers.get('mcp-session-id');
  console.log('HTTP MCP session ID:', sessionId);

  // Step 2: Get tools list using the session ID
  // Wait a bit to ensure the session is properly established
  await new Promise(resolve => setTimeout(resolve, 100));

  const toolsHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
  };

  // Add session ID if available
  if (sessionId) {
    toolsHeaders['mcp-session-id'] = sessionId;
  }

  // Copy any session cookies from the init response
  if (initResponse.headers.get('set-cookie')) {
    toolsHeaders['Cookie'] = initResponse.headers.get('set-cookie')!;
  }

  const toolsResponse = await fetch(url, {
    method: 'POST',
    headers: toolsHeaders,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    })
  });

  if (!toolsResponse.ok) {
    throw new Error(`HTTP MCP tools/list failed: ${toolsResponse.status} ${toolsResponse.statusText}`);
  }

  const toolsResponseText = await toolsResponse.text();
  console.log('HTTP MCP tools/list response:', toolsResponseText);

  // Parse tools response
  let toolsResult: any = null;
  const toolsLines = toolsResponseText.split('\n');
  for (const line of toolsLines) {
    if (line.startsWith('data: ')) {
      try {
        toolsResult = JSON.parse(line.substring(6));
        break;
      } catch (e) {
        console.warn('Failed to parse tools SSE data line:', line);
      }
    }
  }

  if (!toolsResult) {
    throw new Error('Invalid tools/list response from HTTP MCP server');
  }

  if (toolsResult.error) {
    throw new Error(`HTTP MCP tools/list error: ${toolsResult.error.message}`);
  }

  if (!toolsResult.result || !toolsResult.result.tools) {
    console.log('HTTP MCP server returned no tools');
    return [];
  }

  const tools = toolsResult.result.tools.map((tool: any) => tool.name);
  console.log('Extracted tools from HTTP MCP:', tools);
  return tools;
}