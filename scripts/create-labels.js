const readline = require('readline');
const { execSync } = require('child_process');

const labels = [
  // ECSoC26 (Elite Summer of Code 2026)
  { name: 'ECSoC26', color: 'F9D0C4', description: 'Elite Summer of Code 2026 contributions' },
  {
    name: 'ECSoC26-Approved',
    color: '80553B',
    description: 'Approved for Elite Summer of Code 2026',
  },
  {
    name: 'ECSoC26-L1',
    color: 'EDEDED',
    description: 'Level 1 (Easy / Beginner-friendly) ECSoC26 task',
  },
  {
    name: 'ECSoC26-L2',
    color: 'D640C6',
    description: 'Level 2 (Medium / Intermediate) ECSoC26 task',
  },
  { name: 'ECSoC26-L3', color: 'b60205', description: 'Level 3 (Hard / Advanced) ECSoC26 task' },

  // Bonus XP (Project Admins only)
  {
    name: 'good-issue',
    color: 'E5A100',
    description: 'Project Admins only: +10 XP bonus for high-quality issues',
  },
  {
    name: 'good-pr',
    color: '1D76DB',
    description: 'Project Admins only: +15 XP bonus for high-quality pull requests',
  },
  {
    name: 'good-ui',
    color: '0E8A16',
    description: 'Project Admins only: +25 XP bonus for outstanding UI/UX contributions',
  },
  {
    name: 'good-backend',
    color: '6F42C1',
    description: 'Project Admins only: +50 XP bonus for outstanding backend contributions',
  },

  // Hacktoberfest
  { name: 'hacktoberfest', color: 'FF5500', description: 'Hacktoberfest contributions' },
  { name: 'hacktoberfest-accepted', color: 'FF5500', description: 'Approved Hacktoberfest PR' },

  // Difficulty & Contribution
  { name: 'good first issue', color: '7057ff', description: 'Good for newcomers' },
  {
    name: 'beginner friendly',
    color: '0052cc',
    description: 'Perfect for first-time contributors',
  },
  { name: 'help wanted', color: '008672', description: 'Extra attention is needed' },

  // Project Areas
  { name: 'frontend', color: '5319e7', description: 'Frontend related changes' },
  { name: 'backend', color: '1d76db', description: 'Backend related changes' },
  { name: 'database', color: '0366d6', description: 'Database and model related changes' },
  { name: 'ai', color: 'ff00cc', description: 'Artificial Intelligence / Gemini API changes' },
  { name: 'ui/ux', color: 'a2eeef', description: 'UI/UX and design improvements' },
  { name: 'authentication', color: 'e11d48', description: 'Auth, login, and middleware changes' },
  { name: 'pyq-analysis', color: 'bfd4f2', description: 'PYQ analysis features' },
  { name: 'study-planner', color: '1338be', description: 'Study planner features' },
  { name: 'dashboard', color: '7f00ff', description: 'Dashboard related features' },

  // PR Status & Lifecycle
  { name: 'ready-for-review', color: '22c55e', description: 'PR is complete and ready for review' },
  { name: 'work-in-progress', color: 'cfd3d7', description: 'Active development in progress' },
  { name: 'needs-review', color: 'f97316', description: 'Issue or PR needs maintainer review' },
  {
    name: 'needs-rebase',
    color: 'ededed',
    description: 'PR needs to be rebased with the main branch',
  },
];

// Helper to ask user questions in console
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
}

// Try to auto-detect owner and repository name from git remote
let detectedOwner = 'nishit546';
let detectedRepo = 'OpenPrep-AI';
try {
  const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
  // Matches https://github.com/owner/repo.git or git@github.com:owner/repo.git
  const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^.]+)/);
  if (match) {
    detectedOwner = match[1];
    detectedRepo = match[2];
  }
} catch (e) {
  // Git remote check failed, use defaults
}

async function run() {
  console.log('--- GitHub Labels Initializer ---');
  console.log(`Repository detected: ${detectedOwner}/${detectedRepo}\n`);

  const owner =
    (await askQuestion(`Enter GitHub Owner [default: ${detectedOwner}]: `)) || detectedOwner;
  const repo =
    (await askQuestion(`Enter Repository Name [default: ${detectedRepo}]: `)) || detectedRepo;

  console.log('\nTo authenticate with GitHub, you can use a Personal Access Token (PAT).');
  console.log(
    'Alternatively, if you have the GitHub CLI installed, you can leave this blank to use "gh label create" commands.\n'
  );
  const token = await askQuestion(
    'Enter GitHub Personal Access Token (PAT) (leave blank to use GitHub CLI): '
  );

  if (token) {
    console.log('\nInitializing labels using GitHub API and PAT...');
    for (const label of labels) {
      try {
        // Try creating label
        const createRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/labels`, {
          method: 'POST',
          headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'node-fetch',
          },
          body: JSON.stringify({
            name: label.name,
            color: label.color,
            description: label.description,
          }),
        });

        if (createRes.status === 201) {
          console.log(`+ Created label: "${label.name}"`);
        } else if (createRes.status === 422) {
          // Label already exists, let's update it
          const updateRes = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/labels/${encodeURIComponent(label.name)}`,
            {
              method: 'PATCH',
              headers: {
                Authorization: `token ${token}`,
                Accept: 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'User-Agent': 'node-fetch',
              },
              body: JSON.stringify({
                color: label.color,
                description: label.description,
              }),
            }
          );
          if (updateRes.status === 200) {
            console.log(`~ Updated label: "${label.name}"`);
          } else {
            console.error(
              `x Failed to update label: "${label.name}" (Status: ${updateRes.status})`
            );
          }
        } else {
          console.error(`x Failed to create label: "${label.name}" (Status: ${createRes.status})`);
        }
      } catch (err) {
        console.error(`x Error processing label: "${label.name}" - ${err.message}`);
      }
    }
  } else {
    console.log('\nInitializing labels using GitHub CLI ("gh" command)...');
    for (const label of labels) {
      try {
        // Check if label exists by trying to edit it first, or use gh command to create it
        try {
          execSync(
            `gh label create "${label.name}" --color "${label.color}" --description "${label.description}" --repo "${owner}/${repo}" 2>nul`,
            { stdio: 'ignore' }
          );
          console.log(`+ Created label: "${label.name}"`);
        } catch (e) {
          // If creation fails (e.g. already exists), update/clone it
          execSync(
            `gh label edit "${label.name}" --color "${label.color}" --description "${label.description}" --repo "${owner}/${repo}"`,
            { stdio: 'ignore' }
          );
          console.log(`~ Updated label: "${label.name}"`);
        }
      } catch (err) {
        console.error(
          `x Failed to manage label "${label.name}" via CLI. Please ensure you are logged in using "gh auth login".`
        );
      }
    }
  }

  console.log('\nLabel sync operation completed!');
}

run();
