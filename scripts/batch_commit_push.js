const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const repoRoot = path.join(__dirname, '..');

function getUncommittedFiles() {
  const statusOutput = execSync('git status --porcelain', { cwd: repoRoot, encoding: 'utf8' });
  const lines = statusOutput.split('\n').map(l => l.trimEnd()).filter(Boolean);
  
  const files = [];
  for (const line of lines) {
    // Format: ' M file' or '?? file' or 'A  file'
    const filePath = line.substring(3).trim();
    if (filePath) {
      files.push(filePath);
    }
  }
  return files;
}

function getCommitMessage(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  
  if (normalized.startsWith('.github/workflows/claim-issue.yml')) {
    return 'ci(workflows): update claim issue workflow with 3-day deadline notice';
  }
  if (normalized.startsWith('.github/workflows/auto-unassign.yml')) {
    return 'ci(workflows): update auto unassign stale issues workflow to 3-day inactivity cutoff';
  }
  if (normalized === 'scripts/publish-issues.js') {
    return 'chore(scripts): enhance issue publishing automation with rate-limiting and label auto-creation';
  }
  if (normalized === 'scripts/publish-new-25-issues.js') {
    return 'chore(scripts): add automated publisher for new issue batch';
  }
  if (normalized === 'scripts/create_25_curated_issues.js') {
    return 'chore(scripts): add generator for 25 curated issue specifications';
  }
  if (normalized === 'scripts/create_25_github_issues.js') {
    return 'chore(scripts): add github issue generator utility';
  }
  if (normalized === 'scripts/create_25_more_issues.js') {
    return 'chore(scripts): add additional batch issue generator script';
  }
  if (normalized === 'scripts/create_25_new_issues.js') {
    return 'chore(scripts): add batch issue creation script';
  }
  if (normalized === 'create_issues_2.ps1') {
    return 'chore: add powershell script for batch issue creation';
  }
  if (normalized === 'scripts/batch_commit_push.js') {
    return 'chore(scripts): add batch individual commit and push automation utility';
  }
  
  if (normalized.startsWith('issues/')) {
    const fullPath = path.join(repoRoot, filePath);
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      const titleMatch = content.match(/title:\s*['"]?([^'"\r\n]+)['"]?/i);
      const issueNumMatch = normalized.match(/issue-(\d+)/);
      const issueNum = issueNumMatch ? issueNumMatch[1] : '';
      
      let rawTitle = titleMatch ? titleMatch[1] : '';
      rawTitle = rawTitle.replace(/^\[(BUG|FEATURE|ENHANCEMENT|REFACTOR|DOCS)\]:\s*/i, '').trim();
      
      if (rawTitle) {
        return `docs(issues): add issue ${issueNum ? '#' + issueNum + ' ' : ''}- ${rawTitle}`;
      }
    } catch (e) {
      // fallback
    }
    const baseName = path.basename(filePath, '.md').replace(/^issue-\d+-?/, '').replace(/-/g, ' ');
    return `docs(issues): add issue specification for ${baseName}`;
  }
  
  return `chore: update ${path.basename(filePath)}`;
}

function run() {
  const files = getUncommittedFiles();
  console.log(`Found ${files.length} uncommitted files to process.`);

  let successCount = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const msg = getCommitMessage(file);
    const progress = `[${i + 1}/${files.length}]`;

    console.log(`\n========================================`);
    console.log(`${progress} Staging: ${file}`);
    console.log(`Commit Message: "${msg}"`);

    try {
      // Stage file
      execSync(`git add "${file}"`, { cwd: repoRoot, stdio: 'inherit' });

      // Commit file
      execSync(`git commit -m "${msg.replace(/"/g, '\\"')}"`, { cwd: repoRoot, stdio: 'inherit' });

      // Push file
      console.log(`Pushing commit to origin main...`);
      let pushed = false;
      let retries = 3;
      while (!pushed && retries > 0) {
        try {
          execSync(`git push origin main`, { cwd: repoRoot, stdio: 'inherit' });
          pushed = true;
        } catch (pushErr) {
          retries--;
          console.warn(`Push failed. Retrying... (${retries} attempts left)`);
          execSync('node -e "setTimeout(() => {}, 2000)"');
        }
      }

      if (pushed) {
        successCount++;
        console.log(`✓ ${progress} Successfully committed and pushed: ${file}`);
      } else {
        console.error(`✗ ${progress} Failed to push: ${file}`);
        break;
      }
    } catch (err) {
      console.error(`✗ Error processing ${file}:`, err.message);
      break;
    }
  }

  console.log(`\n========================================`);
  console.log(`Summary: Successfully committed and pushed ${successCount} files individually.`);
  console.log(`========================================\n`);
}

run();
