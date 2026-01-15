/**
 * LAVS Manifest Loader
 *
 * Loads and validates lavs.json configuration files.
 */

import fs from 'fs/promises';
import path from 'path';
import { LAVSManifest, LAVSError, LAVSErrorCode, ScriptHandler, FunctionHandler } from './types.js';

export class ManifestLoader {
  /**
   * Load LAVS manifest from file
   * @param manifestPath - Path to lavs.json
   * @returns Parsed and validated manifest with resolved paths
   */
  async load(manifestPath: string): Promise<LAVSManifest> {
    try {
      // 1. Check if file exists
      const exists = await fs.access(manifestPath).then(() => true).catch(() => false);
      if (!exists) {
        throw new LAVSError(
          LAVSErrorCode.InvalidRequest,
          `Manifest file not found: ${manifestPath}`
        );
      }

      // 2. Read file
      const content = await fs.readFile(manifestPath, 'utf-8');

      // 3. Parse JSON
      let parsed: any;
      try {
        parsed = JSON.parse(content);
      } catch (e: any) {
        throw new LAVSError(
          LAVSErrorCode.ParseError,
          `Invalid JSON in manifest: ${e.message}`,
          { cause: e }
        );
      }

      // 4. Basic validation
      this.validateManifest(parsed);

      // 5. Resolve relative paths
      const manifest = this.resolvePaths(parsed, manifestPath);

      return manifest as LAVSManifest;
    } catch (error: any) {
      if (error instanceof LAVSError) {
        throw error;
      }
      throw new LAVSError(
        LAVSErrorCode.InternalError,
        `Failed to load manifest: ${error.message}`,
        { cause: error }
      );
    }
  }

  /**
   * Validate manifest structure and required fields
   */
  private validateManifest(manifest: any): void {
    // Check required top-level fields
    if (!manifest.lavs) {
      throw new LAVSError(
        LAVSErrorCode.InvalidRequest,
        'Missing required field: lavs'
      );
    }

    if (!manifest.name) {
      throw new LAVSError(
        LAVSErrorCode.InvalidRequest,
        'Missing required field: name'
      );
    }

    if (!manifest.version) {
      throw new LAVSError(
        LAVSErrorCode.InvalidRequest,
        'Missing required field: version'
      );
    }

    if (!Array.isArray(manifest.endpoints)) {
      throw new LAVSError(
        LAVSErrorCode.InvalidRequest,
        'Missing or invalid field: endpoints (must be array)'
      );
    }

    // Validate each endpoint
    for (const endpoint of manifest.endpoints) {
      this.validateEndpoint(endpoint);
    }
  }

  /**
   * Validate individual endpoint definition
   */
  private validateEndpoint(endpoint: any): void {
    if (!endpoint.id) {
      throw new LAVSError(
        LAVSErrorCode.InvalidRequest,
        'Endpoint missing required field: id'
      );
    }

    if (!endpoint.method || !['query', 'mutation', 'subscription'].includes(endpoint.method)) {
      throw new LAVSError(
        LAVSErrorCode.InvalidRequest,
        `Invalid endpoint method: ${endpoint.method} (must be query, mutation, or subscription)`
      );
    }

    if (!endpoint.handler) {
      throw new LAVSError(
        LAVSErrorCode.InvalidRequest,
        `Endpoint ${endpoint.id} missing required field: handler`
      );
    }

    this.validateHandler(endpoint.handler, endpoint.id);
  }

  /**
   * Validate handler configuration
   */
  private validateHandler(handler: any, endpointId: string): void {
    if (!handler.type) {
      throw new LAVSError(
        LAVSErrorCode.InvalidRequest,
        `Handler for ${endpointId} missing required field: type`
      );
    }

    const validTypes = ['script', 'function', 'http', 'mcp'];
    if (!validTypes.includes(handler.type)) {
      throw new LAVSError(
        LAVSErrorCode.InvalidRequest,
        `Invalid handler type: ${handler.type} (must be one of: ${validTypes.join(', ')})`
      );
    }

    // Type-specific validation
    if (handler.type === 'script') {
      if (!handler.command) {
        throw new LAVSError(
          LAVSErrorCode.InvalidRequest,
          `Script handler for ${endpointId} missing required field: command`
        );
      }

      if (handler.input && !['args', 'stdin', 'env'].includes(handler.input)) {
        throw new LAVSError(
          LAVSErrorCode.InvalidRequest,
          `Invalid script input mode: ${handler.input} (must be args, stdin, or env)`
        );
      }
    }

    if (handler.type === 'function') {
      if (!handler.module || !handler.function) {
        throw new LAVSError(
          LAVSErrorCode.InvalidRequest,
          `Function handler for ${endpointId} missing required fields: module, function`
        );
      }
    }

    if (handler.type === 'http') {
      if (!handler.url || !handler.method) {
        throw new LAVSError(
          LAVSErrorCode.InvalidRequest,
          `HTTP handler for ${endpointId} missing required fields: url, method`
        );
      }
    }

    if (handler.type === 'mcp') {
      if (!handler.server || !handler.tool) {
        throw new LAVSError(
          LAVSErrorCode.InvalidRequest,
          `MCP handler for ${endpointId} missing required fields: server, tool`
        );
      }
    }
  }

  /**
   * Resolve relative paths in manifest to absolute paths
   * This makes the manifest portable and allows scripts to use relative paths
   */
  private resolvePaths(manifest: any, manifestPath: string): any {
    const basedir = path.dirname(manifestPath);

    // Clone to avoid mutations
    const resolved = JSON.parse(JSON.stringify(manifest));

    // Resolve endpoint handlers
    for (const endpoint of resolved.endpoints) {
      const handler = endpoint.handler;

      if (handler.type === 'script') {
        // Resolve script command path if it looks like a relative file path
        // (has .js, .py, etc. extension and doesn't start with /)
        const cmd = handler.command;
        if (this.isRelativeScriptPath(cmd)) {
          handler.command = path.resolve(basedir, cmd);
        }

        // Resolve cwd if specified
        if (handler.cwd && !path.isAbsolute(handler.cwd)) {
          handler.cwd = path.resolve(basedir, handler.cwd);
        }
      }

      if (handler.type === 'function') {
        // Resolve module path
        if (!path.isAbsolute(handler.module)) {
          handler.module = path.resolve(basedir, handler.module);
        }
      }
    }

    // Resolve view component paths
    if (resolved.view?.component?.type === 'local') {
      const comp = resolved.view.component;
      if (!path.isAbsolute(comp.path)) {
        comp.path = path.resolve(basedir, comp.path);
      }
    }

    return resolved;
  }

  /**
   * Check if a command looks like a relative script path
   * e.g., "scripts/handler.js", "./handler.py", "handler.sh"
   */
  private isRelativeScriptPath(cmd: string): boolean {
    // If starts with ./ or ../, definitely relative
    if (cmd.startsWith('./') || cmd.startsWith('../')) {
      return true;
    }

    // If has path separators and common script extensions
    const scriptExtensions = ['.js', '.ts', '.py', '.sh', '.rb', '.php'];
    const hasExtension = scriptExtensions.some(ext => cmd.endsWith(ext));
    const hasPathSep = cmd.includes('/');

    return hasExtension && (hasPathSep || !cmd.includes(' '));
  }
}
