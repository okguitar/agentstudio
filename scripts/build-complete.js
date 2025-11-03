#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const rootDir = process.cwd();

console.log('🏗️  Building complete AgentStudio application...');

async function buildCompleteApp() {
  try {
    // Step 1: Build backend
    console.log('📦 Building backend...');
    await execAsync('npm run build:backend', { cwd: rootDir, stdio: 'inherit' });

    // Step 2: Build frontend
    console.log('🎨 Building frontend...');
    await execAsync('cd frontend && npm run build', { cwd: rootDir, stdio: 'inherit' });

    // Step 3: Copy frontend files to backend dist
    console.log('📋 Copying frontend files to backend...');
    const backendDistDir = path.join(rootDir, 'backend/dist');
    const frontendDistDir = path.join(rootDir, 'frontend/dist');
    const targetFrontendDir = path.join(backendDistDir, 'frontend');

    // Create frontend directory in backend dist
    if (!fs.existsSync(targetFrontendDir)) {
      fs.mkdirSync(targetFrontendDir, { recursive: true });
    }

    // Copy frontend dist files
    await execAsync(`cp -r "${frontendDistDir}/"* "${targetFrontendDir}/"`, { cwd: rootDir, stdio: 'inherit' });

    // Step 4: Create enhanced index.js with frontend support
    console.log('🔧 Creating enhanced backend with frontend support...');
    const backendIndexPath = path.join(backendDistDir, 'index.js');
    let backendCode = fs.readFileSync(backendIndexPath, 'utf-8');

    // Find the location to inject frontend static file serving
    // Look for the line after slides static files
    const slidesStaticLine = "app.use('/slides', express.static(slidesDir));";
    const insertIndex = backendCode.indexOf(slidesStaticLine);

    if (insertIndex !== -1) {
      const insertPosition = backendCode.indexOf('\n', insertIndex) + 1;

      const frontendStaticCode = `
// Serve frontend static files
const frontendDir = join(__dirname, 'frontend');
app.use(express.static(frontendDir, {
  index: 'index.html'
}));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res, next) => {
  // Skip API routes and static assets
  if (req.path.startsWith('/api') || req.path.startsWith('/slides') || req.path.includes('.')) {
    return next();
  }
  res.sendFile(path.join(frontendDir, 'index.html'));
});
`;

      backendCode = backendCode.slice(0, insertPosition) + frontendStaticCode + backendCode.slice(insertPosition);

      // Write the enhanced backend code
      fs.writeFileSync(backendIndexPath, backendCode);
      console.log('✅ Enhanced backend with frontend support');
    } else {
      console.warn('⚠️  Could not find slides static line to inject frontend code');
    }

    // Step 5: Update CLI to reflect frontend availability
    const cliPath = path.join(backendDistDir, 'bin/agentstudio.js');
    let cliCode = fs.readFileSync(cliPath, 'utf-8');

    // Update the success message to be clearer about frontend availability
    cliCode = cliCode.replace(
      "console.log(`✅ Frontend available at http://${options.host}:${options.port}`);",
      "console.log(`✅ Frontend + Backend running at http://${options.host}:${options.port}`);"
    );

    fs.writeFileSync(cliPath, cliCode);

    console.log('🎉 Complete application built successfully!');
    console.log(`📁 Frontend files: ${targetFrontendDir}`);
    console.log(`🔧 Backend with frontend: ${backendIndexPath}`);

  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

buildCompleteApp();