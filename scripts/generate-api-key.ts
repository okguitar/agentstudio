#!/usr/bin/env tsx
/**
 * Generate API Key Script
 *
 * Usage:
 *   npx tsx scripts/generate-api-key.ts <projectPath> [description]
 *
 * Example:
 *   npx tsx scripts/generate-api-key.ts /Users/john/my-project "Development key"
 */

import { generateApiKey } from '../backend/src/services/a2a/apiKeyService.js';

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: npx tsx scripts/generate-api-key.ts <projectPath> [description]');
    console.error('');
    console.error('Arguments:');
    console.error('  projectPath  Absolute path to the project');
    console.error('  description  Description of the API key (default: "API Key")');
    process.exit(1);
  }

  const [projectPath, description = 'API Key'] = args;

  console.log(`Generating API key for project: ${projectPath}`);
  console.log(`Description: ${description}`);
  console.log('');

  try {
    const { key, keyData } = await generateApiKey(projectPath, description);

    console.log('✅ API Key generated successfully!');
    console.log('');
    console.log('═'.repeat(60));
    console.log('🔑 API Key (show once, save it now!):');
    console.log('═'.repeat(60));
    console.log(key);
    console.log('═'.repeat(60));
    console.log('');
    console.log('📋 Key Metadata:');
    console.log(`  ID:          ${keyData.id}`);
    console.log(`  Project:     ${keyData.projectId}`);
    console.log(`  Description: ${keyData.description}`);
    console.log(`  Created:     ${keyData.createdAt}`);
    console.log('');
    console.log('⚠️  Important:');
    console.log('  - Save this key now. You won\'t be able to see it again.');
    console.log('  - Store it securely (e.g., environment variable, secrets manager).');
    console.log('  - Use it in the Authorization header: Authorization: Bearer <key>');
  } catch (error) {
    console.error('❌ Error generating API key:', error);
    process.exit(1);
  }
}

main();
