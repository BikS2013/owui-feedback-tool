#!/usr/bin/env node

// Test script to investigate USER_PROMPTS_FOLDER source

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Investigating USER_PROMPTS_FOLDER configuration...\n');

// Check if USER_PROMPTS_FOLDER is set in process.env
console.log('1. Checking process.env.USER_PROMPTS_FOLDER:');
console.log(`   Value: ${process.env.USER_PROMPTS_FOLDER || '(not set)'}`);

// Check .env file
console.log('\n2. Checking .env file:');

try {
  const envPath = path.join(__dirname, '..', '.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const userPromptsLine = envContent.split('\n').find(line => line.includes('USER_PROMPTS_FOLDER'));
  console.log(`   Contains USER_PROMPTS_FOLDER: ${userPromptsLine ? 'Yes' : 'No'}`);
  if (userPromptsLine) {
    console.log(`   Line: ${userPromptsLine}`);
  }
} catch (error) {
  console.log('   Error reading .env file:', error.message);
}

// Check environment settings asset key
console.log('\n3. Environment Settings Asset Key:');
console.log(`   ENV_SETTINGS_ASSET_KEY: ${process.env.ENV_SETTINGS_ASSET_KEY || '(not set)'}`);
console.log(`   ENVIRONMENT_SETTINGS_ASSET_KEY: ${process.env.ENVIRONMENT_SETTINGS_ASSET_KEY || '(not set)'}`);

// Load dotenv and check again
console.log('\n4. After loading dotenv:');
dotenv.config({ path: path.join(__dirname, '..', '.env') });
console.log(`   USER_PROMPTS_FOLDER: ${process.env.USER_PROMPTS_FOLDER || '(not set)'}`);
console.log(`   ENV_SETTINGS_ASSET_KEY: ${process.env.ENV_SETTINGS_ASSET_KEY || '(not set)'}`);
console.log(`   ENVIRONMENT_SETTINGS_ASSET_KEY: ${process.env.ENVIRONMENT_SETTINGS_ASSET_KEY || '(not set)'}`);

// Try to load and parse environment settings
console.log('\n5. Attempting to understand environment settings loading:');
console.log('   The environmentSettingsService loads settings from GitHub/database');
console.log('   and applies them as environment variables at runtime.');
console.log('   This explains why USER_PROMPTS_FOLDER appears to work without being in .env');

console.log('\n6. GitHub Configuration:');
console.log(`   GITHUB_REPO: ${process.env.GITHUB_REPO || '(not set)'}`);
console.log(`   GITHUB_CONFIG_REPO: ${process.env.GITHUB_CONFIG_REPO || '(not set)'}`);
console.log(`   GITHUB_TOKEN: ${process.env.GITHUB_TOKEN ? '***' + process.env.GITHUB_TOKEN.slice(-4) : '(not set)'}`);
console.log(`   GITHUB_CONFIG_TOKEN: ${process.env.GITHUB_CONFIG_TOKEN ? '***' + process.env.GITHUB_CONFIG_TOKEN.slice(-4) : '(not set)'}`);

console.log('\n📝 Summary:');
console.log('   USER_PROMPTS_FOLDER is likely set by the environmentSettingsService');
console.log('   which loads from the asset specified by ENVIRONMENT_SETTINGS_ASSET_KEY');
console.log('   This happens during application startup in init-env.ts');