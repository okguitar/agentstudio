#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import os from 'os';

// Function to extract real project path from jsonl session files
function extractRealProjectPath(dirName) {
  const projectsDir = path.join(os.homedir(), '.claude', 'projects');
  const projectDir = path.join(projectsDir, dirName);
  
  try {
    // Find all jsonl files in the project directory
    const files = fs.readdirSync(projectDir).filter(file => file.endsWith('.jsonl'));
    
    for (const file of files) {
      try {
        const filePath = path.join(projectDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const firstLine = content.split('\n')[0];
        
        if (firstLine) {
          const message = JSON.parse(firstLine);
          if (message.cwd) {
            return {
              realPath: message.cwd,
              projectName: path.basename(message.cwd)
            };
          }
        }
      } catch (error) {
        // Skip this file and try the next one
        continue;
      }
    }
  } catch (error) {
    // Directory doesn't exist or can't be read
  }
  
  return null;
}

// Function to extract clean project name from directory name and metadata
function extractCleanProjectName(dirName, metadata) {
  // Try to extract from jsonl session files first
  const realProject = extractRealProjectPath(dirName);
  if (realProject) {
    return realProject.projectName;
  }
  
  // If metadata has migratedFrom, use the original path to extract the real directory name
  if (metadata?.metadata?.migratedFrom) {
    const originalPath = metadata.metadata.migratedFrom;
    return path.basename(originalPath);
  }
  
  // Otherwise, try to extract from the dirName (which is the actual directory name in ~/.claude/projects)
  // The dirName is already the real directory name, so we can try to extract meaningful parts
  if (dirName.includes('-')) {
    // This might be an encoded path, try to extract the last meaningful segment
    const segments = dirName.split('-').filter(segment => segment.length > 0);
    if (segments.length > 0) {
      return segments[segments.length - 1];
    }
  }
  
  // Fallback to original directory name
  return dirName;
}

async function fixProjectNames() {
  const projectsMetaDir = path.join(os.homedir(), '.claude-agent', 'projects');
  
  if (!fs.existsSync(projectsMetaDir)) {
    console.log('No projects metadata directory found');
    return;
  }

  const files = fs.readdirSync(projectsMetaDir).filter(file => file.endsWith('.json'));
  
  console.log(`Found ${files.length} project metadata files to update`);
  
  for (const file of files) {
    const filePath = path.join(projectsMetaDir, file);
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const metadata = JSON.parse(content);
      
      // Extract directory name from filename (remove .json extension)
      const dirName = path.basename(file, '.json');
      const cleanName = extractCleanProjectName(dirName, metadata);
      
      // Update name if it's different from the clean name
      if (metadata.name !== cleanName) {
        console.log(`Updating project name: "${metadata.name}" -> "${cleanName}"`);
        metadata.name = cleanName;
        
        // Write back to file
        fs.writeFileSync(filePath, JSON.stringify(metadata, null, 2), 'utf-8');
        console.log(`✓ Updated ${file}`);
      } else {
        console.log(`⇢ Skipping ${file} (name already clean: "${metadata.name}")`);
      }
    } catch (error) {
      console.error(`✗ Failed to update ${file}:`, error.message);
    }
  }
  
  console.log('Project name fix completed!');
}

fixProjectNames().catch(console.error);