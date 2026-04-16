import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotDir = path.join(__dirname, '..', 'screenshots');

const sections = [
  'dashboard', 'time-tracking', 'attendance', 'projects', 'my-account',
  'activity', 'productivity',
  'employees', 'user-management', 'departments', 'reports',
  'devices', 'software-inventory', 'host-groups', 'security', 'dlp',
  'compliance',
  'support', 'it-support',
  'settings', 'mfa-security', 'sso-providers', 'module-access', 'agent-setup',
];

const labelMap = {
  'dashboard': 'Dashboard',
  'time-tracking': 'Time Tracking',
  'attendance': 'Attendance',
  'projects': 'Projects',
  'my-account': 'My Account',
  'activity': 'Activity',
  'productivity': 'Productivity',
  'employees': 'Employees',
  'user-management': 'User Management',
  'departments': 'Departments',
  'reports': 'Reports',
  'devices': 'Devices',
  'software-inventory': 'Software Inventory',
  'host-groups': 'Host Groups',
  'security': 'Security',
  'dlp': 'DLP Policies',
  'compliance': 'SOC 2 Compliance',
  'support': 'IT Support',
  'it-support': 'IT Admin Portal',
  'settings': 'Settings',
  'mfa-security': 'MFA & Security',
  'sso-providers': 'SSO Providers',
  'module-access': 'Module Access',
  'agent-setup': 'Agent Setup',
};

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1600, height: 900 },
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();

  console.log('Navigating to demo page...');
  const response = await page.goto('http://localhost:3000/demo', { waitUntil: 'networkidle2', timeout: 30000 });
  console.log(`Page loaded: ${page.url()} (status: ${response?.status()})`);

  // Wait for page to fully render
  await new Promise(r => setTimeout(r, 2000));

  // Check the actual URL
  const currentUrl = page.url();
  console.log(`Current URL: ${currentUrl}`);

  if (!currentUrl.includes('/demo')) {
    console.log('ERROR: Redirected away from /demo. Trying again...');
    await page.goto('http://localhost:3000/demo', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));
    console.log(`Retry URL: ${page.url()}`);
  }

  // Check if we see the demo content
  const hasDemo = await page.evaluate(() => {
    return document.body.textContent?.includes('Acme Corp') || document.body.textContent?.includes('DEMO');
  });
  console.log(`Demo content detected: ${hasDemo}`);

  if (!hasDemo) {
    console.log('Page content preview:');
    const text = await page.evaluate(() => document.body.textContent?.substring(0, 200));
    console.log(text);
    await browser.close();
    process.exit(1);
  }

  for (const section of sections) {
    const targetLabel = labelMap[section];
    console.log(`Capturing: ${section} (clicking "${targetLabel}")`);

    // Click the correct sidebar button
    const clicked = await page.evaluate((label) => {
      const allButtons = [...document.querySelectorAll('button')];
      for (const btn of allButtons) {
        const text = btn.textContent?.trim();
        if (text === label) {
          btn.click();
          return true;
        }
      }
      return false;
    }, targetLabel);

    if (!clicked) {
      // Try scrolling the sidebar to find hidden items
      await page.evaluate((label) => {
        const sidebar = document.querySelector('aside') || document.querySelector('nav');
        if (sidebar) sidebar.scrollTop = sidebar.scrollHeight;
        // Try again after scroll
        const allButtons = [...document.querySelectorAll('button')];
        for (const btn of allButtons) {
          if (btn.textContent?.trim() === label) {
            btn.click();
            return true;
          }
        }
        return false;
      }, targetLabel);
    }

    await new Promise(r => setTimeout(r, 600));

    // Scroll main content to top
    await page.evaluate(() => {
      window.scrollTo(0, 0);
      const mainContent = document.querySelector('main') || document.querySelector('.flex-1');
      if (mainContent) mainContent.scrollTop = 0;
    });

    await new Promise(r => setTimeout(r, 200));

    await page.screenshot({
      path: path.join(screenshotDir, `${section}.png`),
      fullPage: false,
    });
    console.log(`  Saved: ${section}.png`);
  }

  // Special: Kanban board view
  console.log('Capturing: kanban-board');
  // First go back to Projects
  await page.evaluate(() => {
    const allButtons = [...document.querySelectorAll('button')];
    for (const btn of allButtons) {
      if (btn.textContent?.trim() === 'Projects') { btn.click(); return; }
    }
  });
  await new Promise(r => setTimeout(r, 600));

  // Click first "View Board" button
  await page.evaluate(() => {
    const allButtons = [...document.querySelectorAll('button')];
    for (const btn of allButtons) {
      if (btn.textContent?.trim() === 'View Board') { btn.click(); return; }
    }
  });
  await new Promise(r => setTimeout(r, 600));

  await page.screenshot({
    path: path.join(screenshotDir, 'kanban-board.png'),
    fullPage: false,
  });
  console.log('  Saved: kanban-board.png');

  await browser.close();
  console.log('\nDone! All screenshots captured.');
}

main().catch(console.error);
