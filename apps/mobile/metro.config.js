const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files in the monorepo root
config.watchFolders = [workspaceRoot];

// 2. Resolve modules from both local and root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Exclude native build and cache directories from Metro file watcher
config.resolver.blockList = [
  /.*[/\\]android[/\\].*/,
  /.*[/\\]ios[/\\].*/,
  /.*[/\\]\.gradle[/\\].*/,
];

module.exports = config;
