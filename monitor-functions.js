#!/usr/bin/env node

/**
 * Firebase Function Performance Monitor for Node.js 22
 *
 * This script monitors the performance of Firebase Functions
 * running on Node.js 22. It helps track CPU and memory usage,
 * cold starts, and other performance metrics.
 *
 * Usage:
 *   node monitor-functions.js --project=your-project-id [options]
 *
 * Options:
 *   --project=PROJECT_ID      Firebase project ID
 *   --duration=MINUTES        Monitoring duration in minutes (default: 30)
 *   --output=FORMAT           Output format: console, json, csv (default: console)
 *   --compare-node18          Compare with Node.js 18 baseline (if available)
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

// Setup dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
let projectId = '';
let outputFormat = 'console';
let monitorDuration = 30; // minutes

// Parse command line arguments
args.forEach(arg => {
  if (arg.startsWith('--project=')) {
    projectId = arg.split('=')[1];
  } else if (arg.startsWith('--format=')) {
    outputFormat = arg.split('=')[1];
  } else if (arg.startsWith('--duration=')) {
    monitorDuration = parseInt(arg.split('=')[1], 10) || 30;
  }
});

// Check if project ID is provided
if (!projectId) {
  try {
    // Try to get default project from firebase config
    projectId = execSync('firebase use', { encoding: 'utf8' }).trim();
    projectId = projectId.match(/Active Project: (.*)/)?.[1] || '';
  } catch (error) {
    console.error('❌ Failed to get default Firebase project');
  }
}

// If still no project ID, show error and exit
if (!projectId) {
  console.error('❌ No project ID provided. Usage: node monitor-functions.js --project=your-project-id');
  process.exit(1);
}

console.log(`🔥 Monitoring Firebase Functions for project ${projectId}`);
console.log(`⏱️  Duration: ${monitorDuration} minutes`);
console.log(`📊 Output format: ${outputFormat}`);

// Run monitoring
async function monitorFunctions() {
  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + (monitorDuration * 60 * 1000));

  console.log(`📋 Starting monitoring at ${startTime.toLocaleString()}`);
  console.log(`📋 Will run until ${endTime.toLocaleString()}`);

  // Create output directory if it doesn't exist
  const outputDir = path.join(__dirname, 'function-metrics');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  // Output files
  const timestampStr = startTime.toISOString().replace(/[:.]/g, '-');
  const metricsFile = path.join(outputDir, `metrics-${projectId}-${timestampStr}.json`);
  const logFile = path.join(outputDir, `logs-${projectId}-${timestampStr}.txt`);

  // Metrics storage
  const metrics = {
    project: projectId,
    startTime: startTime.toISOString(),
    endTime: null,
    runtime: 'nodejs22',
    functions: {},
    summary: {
      totalInvocations: 0,
      averageExecutionTime: 0,
      maxExecutionTime: 0,
      coldStarts: 0,
      errors: 0
    }
  };

  // Monitor function metrics
  try {
    // Use firebase functions:log with filtering for Node.js 22 runtime
    const logProcess = execSync(`firebase functions:list --project=${projectId}`, { encoding: 'utf8' });
    const functions = logProcess
      .split('\n')
      .filter(line => line.includes('(httpsTrigger)'))
      .map(line => line.trim().split(' ')[0]);

    console.log(`📋 Found ${functions.length} HTTP functions: ${functions.join(', ')}`);

    // Initialize metrics for each function
    functions.forEach(funcName => {
      metrics.functions[funcName] = {
        invocations: 0,
        executionTimes: [],
        coldStarts: 0,
        errors: 0,
        lastInvocation: null
      };
    });

    // Monitor logs in real-time
    console.log('📋 Starting log monitoring...');

    // Save our findings periodically
    const saveInterval = setInterval(() => {
      metrics.endTime = new Date().toISOString();
      fs.writeFileSync(metricsFile, JSON.stringify(metrics, null, 2));
      console.log(`📊 Metrics saved to ${metricsFile}`);

      // Check if we've reached the end time
      if (new Date() >= endTime) {
        clearInterval(saveInterval);
        console.log('⏱️  Monitoring duration completed');

        // Calculate summary
        let totalExecTime = 0;
        let totalInvocations = 0;
        let maxExecTime = 0;
        let totalColdStarts = 0;
        let totalErrors = 0;

        Object.values(metrics.functions).forEach(func => {
          totalInvocations += func.invocations;
          totalColdStarts += func.coldStarts;
          totalErrors += func.errors;

          if (func.executionTimes.length > 0) {
            const funcAvgExecTime = func.executionTimes.reduce((a, b) => a + b, 0) / func.executionTimes.length;
            totalExecTime += funcAvgExecTime * func.invocations;

            const funcMaxExecTime = Math.max(...func.executionTimes);
            maxExecTime = Math.max(maxExecTime, funcMaxExecTime);
          }
        });

        metrics.summary.totalInvocations = totalInvocations;
        metrics.summary.averageExecutionTime = totalInvocations > 0 ? totalExecTime / totalInvocations : 0;
        metrics.summary.maxExecutionTime = maxExecTime;
        metrics.summary.coldStarts = totalColdStarts;
        metrics.summary.errors = totalErrors;

        // Save final metrics
        metrics.endTime = new Date().toISOString();
        fs.writeFileSync(metricsFile, JSON.stringify(metrics, null, 2));

        console.log('\n📊 Final Results:');
        console.log(`Total Invocations: ${metrics.summary.totalInvocations}`);
        console.log(`Average Execution Time: ${metrics.summary.averageExecutionTime.toFixed(2)}ms`);
        console.log(`Maximum Execution Time: ${metrics.summary.maxExecutionTime}ms`);
        console.log(`Cold Starts: ${metrics.summary.coldStarts}`);
        console.log(`Errors: ${metrics.summary.errors}`);

        console.log(`\n📋 Detailed metrics saved to ${metricsFile}`);
        process.exit(0);
      }
    }, 10000); // Save every 10 seconds

    // This would typically be an ongoing stream of logs, but for the script's clarity
    // we'll use periodic checks instead of an actual streaming implementation
    const checkLogsInterval = setInterval(() => {
      try {
        const logs = execSync(`firebase functions:log --project=${projectId} --minutes=1`, { encoding: 'utf8' });

        // Append logs to log file
        fs.appendFileSync(logFile, logs);

        // Process logs for metrics
        logs.split('\n').forEach(line => {
          // Example: Parse execution time, cold starts, errors from logs
          functions.forEach(funcName => {
            if (line.includes(funcName) && line.includes('Function execution took')) {
              // Extract execution time
              const execTimeMatch = line.match(/Function execution took (\d+) ms/);
              if (execTimeMatch) {
                const execTime = parseInt(execTimeMatch[1], 10);
                metrics.functions[funcName].executionTimes.push(execTime);
                metrics.functions[funcName].invocations++;
                metrics.functions[funcName].lastInvocation = new Date().toISOString();
              }

              // Check for cold start
              if (line.includes('Cold start')) {
                metrics.functions[funcName].coldStarts++;
              }
            }

            // Check for errors
            if (line.includes(funcName) && (line.includes('Error:') || line.includes('Exception:'))) {
              metrics.functions[funcName].errors++;
            }
          });
        });
      } catch (error) {
        console.error(`❌ Error fetching logs: ${error.message}`);
      }
    }, 60000); // Check logs every minute

    // Handle script termination
    process.on('SIGINT', () => {
      clearInterval(saveInterval);
      clearInterval(checkLogsInterval);

      console.log('\n👋 Monitoring stopped by user');

      // Save final metrics
      metrics.endTime = new Date().toISOString();
      fs.writeFileSync(metricsFile, JSON.stringify(metrics, null, 2));

      console.log(`📋 Final metrics saved to ${metricsFile}`);
      process.exit(0);
    });
  } catch (error) {
    console.error(`❌ Error monitoring functions: ${error.message}`);
    process.exit(1);
  }
}

monitorFunctions().catch(error => {
  console.error(`❌ Fatal error: ${error.message}`);
  process.exit(1);
});
