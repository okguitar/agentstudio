#!/usr/bin/env node

/**
 * Todo Service Script
 *
 * Manages todo data in a JSON file.
 * Usage:
 *   node todo-service.js list
 *   node todo-service.js add < input.json
 *   node todo-service.js toggle < input.json
 *   node todo-service.js delete < input.json
 */

const fs = require('fs');
const path = require('path');

/**
 * Get project-specific data file path
 * Priority:
 * 1. LAVS_PROJECT_PATH env var (passed from backend)
 * 2. Fallback to agent's data directory
 */
function getDataFilePath() {
  const projectPath = process.env.LAVS_PROJECT_PATH;

  if (projectPath) {
    // Use project-specific path: <projectPath>/.agentstudio/todo-manager/todos.json
    return path.join(projectPath, '.agentstudio', 'todo-manager', 'todos.json');
  } else {
    // Fallback to agent's data directory (for testing/standalone)
    return path.join(__dirname, '../data/todos.json');
  }
}

// Data file path (project-specific or fallback)
const DATA_FILE = getDataFilePath();

// Always log which data file is being used (to stderr so it doesn't interfere with JSON output)
console.error(`[TodoService] LAVS_PROJECT_PATH: ${process.env.LAVS_PROJECT_PATH || '(not set)'}`);
console.error(`[TodoService] Using data file: ${DATA_FILE}`);

// Ensure data directory exists
const dataDir = path.dirname(DATA_FILE);
if (!fs.existsSync(dataDir)) {
  console.error(`[TodoService] Creating directory: ${dataDir}`);
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize data file if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
  console.error(`[TodoService] Initializing new data file: ${DATA_FILE}`);
  fs.writeFileSync(DATA_FILE, JSON.stringify({ todos: [] }, null, 2));
}

/**
 * Load todos from file
 */
function loadTodos() {
  try {
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    const data = JSON.parse(content);
    return data.todos || [];
  } catch (error) {
    console.error('Error loading todos:', error.message);
    return [];
  }
}

/**
 * Save todos to file
 */
function saveTodos(todos) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ todos }, null, 2));
  } catch (error) {
    console.error('Error saving todos:', error.message);
    throw error;
  }
}

/**
 * Generate next ID
 */
function getNextId(todos) {
  if (todos.length === 0) return 1;
  return Math.max(...todos.map(t => t.id)) + 1;
}

/**
 * Read stdin as JSON
 */
async function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';

    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', chunk => {
      data += chunk;
    });

    process.stdin.on('end', () => {
      try {
        if (!data.trim()) {
          resolve({});
        } else {
          resolve(JSON.parse(data));
        }
      } catch (error) {
        reject(new Error(`Invalid JSON input: ${error.message}`));
      }
    });

    process.stdin.on('error', reject);
  });
}

/**
 * Main function
 */
async function main() {
  const action = process.argv[2];

  if (!action) {
    console.error('Error: No action specified');
    process.exit(1);
  }

  try {
    switch (action) {
      case 'list': {
        // List all todos
        const todos = loadTodos();
        console.log(JSON.stringify(todos, null, 2));
        break;
      }

      case 'add': {
        // Add new todo
        const input = await readStdin();

        if (!input.text) {
          throw new Error('Missing required field: text');
        }

        const todos = loadTodos();
        const newTodo = {
          id: getNextId(todos),
          text: input.text,
          done: false,
          priority: input.priority || 0,
          createdAt: new Date().toISOString(),
        };

        todos.push(newTodo);
        saveTodos(todos);

        console.log(JSON.stringify(newTodo, null, 2));
        break;
      }

      case 'toggle': {
        // Toggle todo done status
        const input = await readStdin();

        if (input.id == null) {
          throw new Error('Missing required field: id');
        }

        const todos = loadTodos();
        const todo = todos.find(t => t.id === input.id);

        if (!todo) {
          throw new Error(`Todo not found: ${input.id}`);
        }

        todo.done = !todo.done;
        saveTodos(todos);

        console.log(JSON.stringify(todo, null, 2));
        break;
      }

      case 'delete': {
        // Delete todo
        const input = await readStdin();

        if (input.id == null) {
          throw new Error('Missing required field: id');
        }

        const todos = loadTodos();
        const index = todos.findIndex(t => t.id === input.id);

        if (index === -1) {
          throw new Error(`Todo not found: ${input.id}`);
        }

        todos.splice(index, 1);
        saveTodos(todos);

        console.log(JSON.stringify({ success: true }, null, 2));
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
