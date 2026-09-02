const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const issuesDir = path.join(__dirname, '..', 'issues');
const targetLimit = parseInt(process.argv[2], 10) || 25;

// Pre-fetch list of valid repo labels ONCE
let validRepoLabels = [];
try {
  const labelsJson = execSync('gh label list --json name --limit 200', { encoding: 'utf8' });
  validRepoLabels = JSON.parse(labelsJson).map(l => l.name);
} catch (e) {
  console.warn('Warning: Could not fetch GitHub labels via CLI:', e.message);
}

// Function to ensure label exists in repo
function ensureLabel(name) {
  const matched = validRepoLabels.find(vl => vl.toLowerCase() === name.toLowerCase());
  if (matched) return matched;

  // Otherwise create it
  try {
    console.log(`Creating missing label on GitHub: "${name}"`);
    execSync(`gh label create "${name}" --color "a2eeef" --description "${name} related tasks"`, { stdio: 'ignore' });
    validRepoLabels.push(name);
    return name;
  } catch (err) {
    return null;
  }
}

// Fetch existing issue titles on GitHub to avoid duplicates
let existingIssueTitles = [];
try {
  const issuesJson = execSync('gh issue list --limit 300 --state all --json title', { encoding: 'utf8' });
  existingIssueTitles = JSON.parse(issuesJson).map(i => i.title.toLowerCase().trim());
} catch (e) {
  console.warn('Warning: Could not fetch existing GitHub issues via CLI:', e.message);
}

const files = fs.readdirSync(issuesDir).filter(f => f.endsWith('.md')).sort();

console.log(`Found ${files.length} issue specification files in ${issuesDir}`);
console.log(`Targeting creation of ${targetLimit} issues...\n`);

let createdCount = 0;
let skippedCount = 0;

for (const file of files) {
  if (createdCount >= targetLimit) {
    console.log(`\nTarget limit of ${targetLimit} issues reached!`);
    break;
  }

  const filePath = path.join(issuesDir, file);
  const content = fs.readFileSync(filePath, 'utf8');

  // Match YAML frontmatter
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatterMatch) continue;

  const frontmatter = frontmatterMatch[1];
  const body = content.replace(/^---\r?\n[\s\S]*?\r?\n---/, '').trim();

  // Extract title
  const titleMatch = frontmatter.match(/title:\s*['"]?(.*?)['"]?\r?$/m);
  const title = titleMatch ? titleMatch[1].trim() : file.replace('.md', '');

  // Check if title already exists on GitHub
  if (existingIssueTitles.includes(title.toLowerCase().trim())) {
    console.log(`[SKIP] Already exists on GitHub: ${file} ("${title}")`);
    skippedCount++;
    continue;
  }

  // Extract raw labels
  const labelsMatch = frontmatter.match(/labels:\s*['"]?(.*?)['"]?\r?$/m);
  const rawLabels = labelsMatch ? labelsMatch[1].split(',').map(s => s.trim()) : [];

  // Map & match labels
  const appliedLabels = [];
  for (let l of rawLabels) {
    let normalized = l;
    if (l.toLowerCase() === 'feature') normalized = 'enhancement';
    if (l.toLowerCase() === 'fullstack') normalized = 'frontend';
    if (l.toLowerCase() === 'architecture') normalized = 'backend';
    if (l.toLowerCase() === 'performance') normalized = 'medium-priority';

    const matched = ensureLabel(normalized);
    if (matched && !appliedLabels.includes(matched)) {
      appliedLabels.push(matched);
    }
  }

  console.log(`----------------------------------------`);
  console.log(`[${createdCount + 1}/${targetLimit}] Creating GitHub Issue for ${file}: "${title}"`);
  console.log(`Labels: ${appliedLabels.join(', ')}`);

  const tempBodyFile = path.join(__dirname, `temp_body_${file.replace('.md', '')}.md`);
  fs.writeFileSync(tempBodyFile, body, 'utf8');

  const labelFlags = appliedLabels.map(l => `--label "${l}"`).join(' ');
  const escapedTitle = title.replace(/"/g, '\\"');
  const cmd = `gh issue create --title "${escapedTitle}" --body-file "${tempBodyFile}" ${labelFlags}`;

  try {
    const output = execSync(cmd, { cwd: path.join(__dirname, '..'), encoding: 'utf8' });
    console.log(`Success: ${output.trim()}`);
    createdCount++;
    existingIssueTitles.push(title.toLowerCase().trim());
  } catch (err) {
    console.error(`Error creating issue for ${file}:`, err.stdout || err.stderr || err.message);
  } finally {
    if (fs.existsSync(tempBodyFile)) {
      fs.unlinkSync(tempBodyFile);
    }
  }

  // Small delay to prevent hitting secondary rate limits
  execSync('node -e "setTimeout(() => {}, 1500)"');
}

console.log(`\n========================================`);
console.log(`Publishing Complete! Summary:`);
console.log(`- Total Issue Files in Directory: ${files.length}`);
console.log(`- Newly Created: ${createdCount}`);
console.log(`- Already Existing (Skipped): ${skippedCount}`);
console.log(`========================================\n`);


