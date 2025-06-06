#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const workflowPath = path.resolve(__dirname, '../.github/workflows/firebase-deploy.yml');

console.log('🔍 Validating GitHub Actions workflow...');

if (!fs.existsSync(workflowPath)) {
  console.error('❌ Error: Workflow file not found at', workflowPath);
  process.exit(1);
}

try {
  const workflowContent = fs.readFileSync(workflowPath, 'utf8');
  const workflow = yaml.load(workflowContent);

  console.log('✅ Workflow YAML syntax is valid');
  console.log('📋 Workflow name:', workflow.name);
  console.log('📋 Jobs:', Object.keys(workflow.jobs).join(', '));

  // Check for common issues
  const job = workflow.jobs.build_and_deploy;
  if (job) {
    console.log('📋 Steps in build_and_deploy job:', job.steps.length);

    // Check for steps that might have issues
    job.steps.forEach((step, index) => {
      if (step.if && step.if.includes('steps.determine_env.outputs.ENVIRONMENT')) {
        console.log(`⚠️  Step ${index + 1} (${step.name}) uses potentially invalid context: steps.determine_env.outputs.ENVIRONMENT`);
      }
      if (step.if && step.if.includes('env.project_id')) {
        console.log(`⚠️  Step ${index + 1} (${step.name}) uses potentially invalid context: env.project_id`);
      }
    });
  }

  console.log('✅ Basic workflow validation complete');

} catch (error) {
  console.error('❌ Error validating workflow:', error.message);
  process.exit(1);
}
