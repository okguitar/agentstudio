import express from 'express';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

const router = express.Router();

// Get user's home directory
const getUserHomeDir = () => homedir();
const getGlobalMemoryPath = () => join(getUserHomeDir(), 'claude.md');

// GET /api/settings/global-memory - Read global memory file
router.get('/global-memory', async (req, res) => {
  try {
    const filePath = getGlobalMemoryPath();
    
    try {
      const content = await readFile(filePath, 'utf-8');
      res.type('text/plain').send(content);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, return empty content
        res.type('text/plain').send('');
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error reading global memory:', error);
    res.status(500).json({
      error: 'Failed to read global memory',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/settings/global-memory - Write global memory file
router.post('/global-memory', express.text({ type: 'text/plain' }), async (req, res) => {
  try {
    const content = req.body;
    
    if (typeof content !== 'string') {
      return res.status(400).json({
        error: 'Invalid content type',
        message: 'Content must be a string'
      });
    }

    const filePath = getGlobalMemoryPath();
    
    await writeFile(filePath, content, 'utf-8');
    
    res.json({
      success: true,
      message: 'Global memory saved successfully',
      filePath
    });
  } catch (error) {
    console.error('Error writing global memory:', error);
    res.status(500).json({
      error: 'Failed to save global memory',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/settings/global-memory/path - Get the path to the global memory file
router.get('/global-memory/path', (req, res) => {
  try {
    const filePath = getGlobalMemoryPath();
    res.json({
      path: filePath,
      homeDir: getUserHomeDir()
    });
  } catch (error) {
    console.error('Error getting global memory path:', error);
    res.status(500).json({
      error: 'Failed to get file path',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
