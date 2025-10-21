import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should display the home page with Next.js logo', async ({ page }) => {
    await page.goto('/');

    // Check if the Next.js logo is visible
    const logo = page.getByAltText('Next.js logo');
    await expect(logo).toBeVisible();
  });

  test('should display main content and instructions', async ({ page }) => {
    await page.goto('/');

    // Check for main instruction text
    await expect(page.getByText('Get started by editing')).toBeVisible();
    await expect(page.getByText('app/page.tsx')).toBeVisible();
  });

  test('should have working links', async ({ page }) => {
    await page.goto('/');

    // Check if the "Deploy now" link exists
    const deployLink = page.getByRole('link', { name: /Deploy now/i });
    await expect(deployLink).toBeVisible();
    await expect(deployLink).toHaveAttribute('href', /vercel.com/);

    // Check if the "Read our docs" link exists
    const docsLink = page.getByRole('link', { name: /Read our docs/i });
    await expect(docsLink).toBeVisible();
    await expect(docsLink).toHaveAttribute('href', /nextjs.org\/docs/);
  });

  test('should have footer links', async ({ page }) => {
    await page.goto('/');

    // Check for footer links
    await expect(page.getByRole('link', { name: /Learn/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Examples/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Go to nextjs.org/i })).toBeVisible();
  });

  test('should have proper page title', async ({ page }) => {
    await page.goto('/');

    // Check page title
    await expect(page).toHaveTitle(/Create Next App/);
  });
});
