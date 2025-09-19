import express from 'express';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { spawn } from 'child_process';

const router: express.Router = express.Router();

// MCP configuration interface
interface McpServerConfig {
  name: string;
  command: string;
  args: string[];
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
    const { name, command, args, timeout, autoApprove } = req.body;
    
    if (!name || !command || !Array.isArray(args)) {
      return res.status(400).json({ error: 'Missing required fields: name, command, args' });
    }
    
    const config = readMcpConfig();
    
    // Create server config without name field
    const serverConfig: Omit<McpServerConfig, 'name'> = {
      command,
      args,
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
    const { command, args, timeout, autoApprove } = req.body;
    
    if (!command || !Array.isArray(args)) {
      return res.status(400).json({ error: 'Missing required fields: command, args' });
    }
    
    const config = readMcpConfig();
    
    if (!config.mcpServers[name]) {
      return res.status(404).json({ error: 'MCP configuration not found' });
    }
    
    // Update server config
    const serverConfig: Omit<McpServerConfig, 'name'> = {
      command,
      args,
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
    
    // Start MCP server process to test connection
    console.log('Starting MCP server:', serverConfig.command, serverConfig.args);
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
    
  } catch (error) {
    console.error('Failed to validate MCP server:', error);
    res.status(500).json({ 
      error: 'Failed to validate MCP server',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
