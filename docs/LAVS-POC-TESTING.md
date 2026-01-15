# LAVS PoC Testing Guide

This guide explains how to test the LAVS (Local Agent View Service) Proof of Concept implementation.

## 🎯 What's Been Implemented

### Backend
- ✅ LAVS type system and manifest format
- ✅ Manifest loader with validation
- ✅ Script executor (supports stdin/args/env input modes)
- ✅ HTTP routes for calling endpoints
- ✅ Todo Manager example agent

### Frontend
- ✅ LAVS Client SDK (TypeScript)
- ✅ Todo Manager Web Component with beautiful UI
- ✅ Standalone testing support

### Still TODO
- ⏳ LAVSViewContainer integration in AgentStudio
- ⏳ AI Agent tool auto-registration
- ⏳ End-to-end integration testing

## 🚀 Quick Start

### 1. Start the Backend

```bash
# Build backend (if not already built)
pnpm run build:backend

# Start backend server
pnpm run dev:backend
```

The backend will start on `http://localhost:4936`.

### 2. Test LAVS API Endpoints

```bash
# Run the test script
./test-lavs.sh
```

This will test:
- Getting the manifest
- Listing todos
- Adding a new todo
- Verifying the new todo appears in the list

### 3. Test the Todo View UI

#### Option A: Direct File Access (Simplest)

1. Open `agents/todo-manager/view/index.html` in your browser
2. The view will automatically connect to the backend API
3. Try adding, toggling, and deleting todos

**Note:** You may need to disable CORS in your browser for local file testing, or use a local server (see Option B).

#### Option B: Serve via HTTP Server

```bash
# From the project root
cd agents/todo-manager/view
python3 -m http.server 8000

# Or use any other static server
# npx serve .
```

Then open: `http://localhost:8000`

### 4. Verify Data Persistence

Check that data is saved:

```bash
cat agents/todo-manager/data/todos.json
```

You should see your todos stored in JSON format.

## 📝 Manual API Testing

### Get Manifest

```bash
curl http://localhost:4936/api/agents/todo-manager/lavs/manifest | jq
```

Expected response:
```json
{
  "lavs": "1.0",
  "name": "todo-manager",
  "version": "1.0.0",
  "endpoints": [
    {
      "id": "listTodos",
      "method": "query",
      ...
    },
    ...
  ]
}
```

### List Todos

```bash
curl -X POST http://localhost:4936/api/agents/todo-manager/lavs/listTodos \
  -H "Content-Type: application/json" \
  -d '{}' | jq
```

### Add Todo

```bash
curl -X POST http://localhost:4936/api/agents/todo-manager/lavs/addTodo \
  -H "Content-Type: application/json" \
  -d '{"text": "My new task", "priority": 1}' | jq
```

### Toggle Todo

```bash
curl -X POST http://localhost:4936/api/agents/todo-manager/lavs/toggleTodo \
  -H "Content-Type: application/json" \
  -d '{"id": 1}' | jq
```

### Delete Todo

```bash
curl -X POST http://localhost:4936/api/agents/todo-manager/lavs/deleteTodo \
  -H "Content-Type: application/json" \
  -d '{"id": 1}' | jq
```

## 🧪 Testing Scenarios

### Scenario 1: Basic CRUD Operations

1. ✅ List initial todos (should show 2 welcome todos)
2. ✅ Add a new todo
3. ✅ Toggle todo done status
4. ✅ Delete a todo
5. ✅ Verify data persists in `data/todos.json`

### Scenario 2: Error Handling

1. ✅ Call non-existent endpoint → 404 error
2. ✅ Invalid input (missing required field) → validation error
3. ✅ Toggle non-existent todo → handler error

### Scenario 3: UI Interaction

1. ✅ Add todo via form input
2. ✅ Click checkbox to toggle done
3. ✅ Hover to show delete button
4. ✅ Confirm deletion dialog
5. ✅ See real-time updates

## 🔍 Debugging

### Backend Logs

Watch the backend console for LAVS execution logs:

```
[LAVS] Executing script for listTodos { command: 'node', args: [...], input: 'args' }
[LAVS] Script completed in 45ms { endpointId: 'listTodos', exitCode: 0 }
```

### Frontend Console

Open browser DevTools and check:
- Network tab for API calls
- Console for LAVS client debug logs

### Common Issues

**CORS Error:**
- Solution: Backend should allow `http://localhost:*` origins
- Or use the served version (Option B above)

**404 on Manifest:**
- Check backend is running
- Verify agent directory exists: `ls agents/todo-manager`
- Check `lavs.json` is valid

**Script Execution Error:**
- Check Node.js is installed: `node --version`
- Verify script has correct permissions
- Check script syntax: `node agents/todo-manager/scripts/todo-service.js list`

## 📊 Expected Behavior

### When Everything Works:

1. **Backend API**: Returns JSON responses with correct data
2. **Todo View**:
   - Shows gradient purple header
   - Lists todos with checkboxes
   - Allows adding new todos via form
   - Updates immediately when interacting
3. **Data File**: Updates in real-time at `agents/todo-manager/data/todos.json`

## 🎨 UI Features

The Todo View includes:
- ✨ Beautiful gradient design (purple theme)
- 📝 Add todo form with auto-focus
- ✅ Toggle completion with checkboxes
- 🏷️ Priority badges (P0-P3)
- 🗑️ Delete buttons (show on hover)
- 📊 Task counter in header
- 🎭 Empty state illustration
- ⚡ Smooth transitions and hover effects

## 🔬 Next Steps for Full Integration

To complete the LAVS PoC:

1. **LAVSViewContainer Component**
   - Integrate todo view into AgentStudio's right panel
   - Replace file browser when agent has LAVS config
   - Handle component loading (local/CDN/npm)

2. **AI Agent Tools**
   - Auto-generate tools from `lavs.json` endpoints
   - Let AI call `addTodo`, `toggleTodo`, etc.
   - Notify view when AI makes changes

3. **End-to-End Flow**
   - User asks: "Add a todo: finish the LAVS demo"
   - AI calls `addTodo` endpoint
   - Todo appears in the view automatically
   - User can then manually toggle/delete via UI

## 📸 Screenshots

When testing, you should see:

**Todo View:**
```
╔══════════════════════════════════════╗
║       📝 Todo Manager                ║
║    Powered by LAVS • 3 tasks         ║
╠══════════════════════════════════════╣
║  [What needs to be done?] [Add Todo]║
╠══════════════════════════════════════╣
║  ☐ Welcome to LAVS Todo Manager!    ║
║  ☐ Try adding a new todo via AI  [P1]║
║  ☑ Test LAVS integration         [P1]║
╚══════════════════════════════════════╝
```

## 📚 References

- [LAVS Specification](./LAVS-SPEC.md)
- [LAVS Implementation Guide](./LAVS-IMPLEMENTATION.md)
- [Todo Manager Config](../agents/todo-manager/lavs.json)
- [Todo Service Script](../agents/todo-manager/scripts/todo-service.js)
- [Todo View Component](../agents/todo-manager/view/index.html)

## 🎉 Success Criteria

You've successfully tested LAVS when:

- ✅ All API endpoints return valid JSON
- ✅ Todo view loads and displays todos
- ✅ Can add todos via UI
- ✅ Can toggle and delete todos
- ✅ Data persists in JSON file
- ✅ No errors in browser console
- ✅ Backend logs show successful script executions

---

**Questions or Issues?**

Check the backend console logs and browser DevTools for detailed error messages.
