import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test('should redirect to login page from home', async ({ page }) => {
    await page.goto('/');

    // Should redirect to /login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should display the app title', async ({ page }) => {
    await page.goto('/login');

    // Check for app title
    await expect(page.getByText('割り勘管理アプリ')).toBeVisible();
  });

  test('should display LINE login button', async ({ page }) => {
    await page.goto('/login');

    // Check if LINE login button is visible
    const lineLoginButton = page.getByRole('button', { name: /LINEでログイン/i });
    await expect(lineLoginButton).toBeVisible();
  });

  test('should display admin login form', async ({ page }) => {
    await page.goto('/login');

    // Check for admin login form elements
    await expect(page.getByText('管理者ログイン')).toBeVisible();
    await expect(page.getByLabel(/ユーザー名/i)).toBeVisible();
    await expect(page.getByLabel(/パスワード/i)).toBeVisible();

    // Check for admin login button
    const loginButtons = page.getByRole('button', { name: /ログイン/i });
    await expect(loginButtons.last()).toBeVisible();
  });

  test('should have proper page title', async ({ page }) => {
    await page.goto('/login');

    // Check page title
    await expect(page).toHaveTitle(/割り勘管理アプリ/);
  });
});
