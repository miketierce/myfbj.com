const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

try {
  const filePath = path.join(process.cwd(), '.github', 'workflows', 'firebase-deploy.yml');

  // Read the file content
  let fileContent = fs.readFileSync(filePath, 'utf8');

  // Remove comment-only lines that start with //
  const lines = fileContent.split('\n');
  const cleanedLines = lines.filter(line => !line.trim().startsWith('//'));
  fileContent = cleanedLines.join('\n');

  // Try to parse the YAML
  const parsedYaml = yaml.load(fileContent);
  console.log('YAML Validation: Success!');
  console.log('Structure overview:');
  console.log(JSON.stringify(parsedYaml, null, 2).substring(0, 200) + '...');
} catch (error) {
  console.error('YAML Validation: Failed');
  console.error(`Error: ${error.message}`);

  // If we have a line number in the error, show the problematic line
  const lineMatch = error.message.match(/line (\d+)/);
  if (lineMatch) {
    const lineNum = parseInt(lineMatch[1]) - 1; // YAML line numbers are 1-based
    const lines = fs.readFileSync(path.join(process.cwd(), '.github', 'workflows', 'firebase-deploy.yml'), 'utf8').split('\n');

    console.error('\nProblematic section:');
    for (let i = Math.max(0, lineNum - 3); i <= Math.min(lines.length - 1, lineNum + 3); i++) {
      console.error(`${i + 1}${i === lineNum ? ' >>> ' : '     '}${lines[i]}`);
    }
  }

  process.exit(1);
}
