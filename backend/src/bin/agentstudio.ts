#!/usr/bin/env node
import { program } from 'commander';
import app from '../index';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read version from root package.json
const rootPackageJson = JSON.parse(readFileSync(path.join(__dirname, '../../../package.json'), 'utf8'));
const version = rootPackageJson.version || '0.1.0';

program
    .name('agentstudio')
    .description('AgentStudio - AI-powered presentation editor with Claude integration')
    .version(version);

// Start both frontend and backend
program
    .command('start')
    .description('Start both frontend and backend servers')
    .option('-p, --port <port>', 'backend server port', '4936')
    .option('-f, --frontend-port <port>', 'frontend server port', '3000')
    .option('-h, --host <host>', 'server host', '0.0.0.0')
    .option('-c, --config <path>', 'path to config file')
    .option('--env <path>', 'path to .env file')
    .option('--no-auth', 'disable authentication (development only)')
    .action(async (options: any) => {
        console.log('🚀 Starting AgentStudio...');

        // Start backend
        process.env.PORT = options.port;
        process.env.HOST = options.host;

        if (options.env) {
            process.env.ENV_PATH = options.env;
        }
        if (options.config) {
            process.env.CONFIG_PATH = options.config;
        }
        if (options.noAuth) {
            process.env.NO_AUTH = 'true';
        }

        try {
            // Start backend server
            app.listen(options.port, options.host, () => {
                console.log(`✅ Backend running on http://${options.host}:${options.port}`);
            });

            // Serve frontend static files
            console.log(`✅ Frontend available at http://${options.host}:${options.port}`);
            console.log('📖 Open your browser to start using AgentStudio');
        } catch (error) {
            console.error('❌ Failed to start AgentStudio:', error);
            process.exit(1);
        }
    });

// Start backend only
program
    .command('backend')
    .description('Start backend server only')
    .option('-p, --port <port>', 'server port', '4936')
    .option('-h, --host <host>', 'server host', '0.0.0.0')
    .option('-c, --config <path>', 'path to config file')
    .option('--env <path>', 'path to .env file')
    .option('--no-auth', 'disable authentication (development only)')
    .action(async (options: any) => {
        console.log('🚀 Starting AgentStudio Backend...');

        process.env.PORT = options.port;
        process.env.HOST = options.host;

        if (options.env) {
            process.env.ENV_PATH = options.env;
        }
        if (options.config) {
            process.env.CONFIG_PATH = options.config;
        }
        if (options.noAuth) {
            process.env.NO_AUTH = 'true';
        }

        try {
            app.listen(options.port, options.host, () => {
              console.log(`✅ Backend running on http://${options.host}:${options.port}`);
          });
        } catch (error) {
            console.error('❌ Failed to start backend:', error);
            process.exit(1);
        }
    });

// Initialize configuration
program
    .command('init')
    .description('Initialize AgentStudio configuration')
    .option('--env <path>', 'path to create .env file', '.env')
    .action(async (options: any) => {
        console.log('🔧 Initializing AgentStudio configuration...');

        const fs = await import('fs-extra');
        const path = await import('path');

        const envPath = path.default.resolve(options.env);
        const envContent = `# AgentStudio Configuration
# AI Provider (choose one)
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Server Configuration
PORT=4936
NODE_ENV=production

# File System
SLIDES_DIR=./slides

# CORS Configuration (optional)
# Add custom origins for production deployments
CORS_ORIGINS=https://your-frontend.vercel.app,https://custom-domain.com
`;

        try {
            await fs.default.ensureFile(envPath);
            await fs.default.writeFile(envPath, envContent);
            console.log(`✅ Configuration file created: ${envPath}`);
            console.log('📝 Please edit the .env file with your API keys and settings');
        } catch (error) {
            console.error('❌ Failed to create configuration file:', error);
            process.exit(1);
        }
    });

program.parse();