import { test, expect } from './fixtures/testFixtures';

test.describe('Mock Exam Simulator Flow', () => {
  test('should render exam simulator page, trigger fullscreen, handle violations, and submit scorecard', async ({ authenticatedPage }) => {
    // Intercept mock exam API endpoints
    await authenticatedPage.route('**/api/mock-exams/exam_test_123/start', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { id: 'session_e2e_123', status: 'started' }
        })
      });
    });

    await authenticatedPage.route('**/api/mock-exams/session_e2e_123/heartbeat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { violationsCount: 1 } })
      });
    });

    await authenticatedPage.route('**/api/mock-exams/session_e2e_123/submit', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            sessionId: 'session_e2e_123',
            score: 85.0,
            violationsCount: 1,
            percentile: 92.5,
            sectionPercentiles: { physics: 90.0, chemistry: 88.0, mathematics: 95.0 }
          }
        })
      });
    });

    // Go to exam simulator URL
    await authenticatedPage.goto('/mock-exam/exam_test_123');

    // Verify fullscreen guard banner is visible
    await expect(authenticatedPage.getByText(/FULL SCREEN ENFORCEMENT ACTIVE/i)).toBeVisible();

    // Verify Request/Enter fullscreen button is present
    const fullscreenButton = authenticatedPage.getByRole('button', { name: /Enter Fullscreen/i });
    await expect(fullscreenButton).toBeVisible();

    // Click to enter simulation mode
    await fullscreenButton.click();

    // Simulate window blur trigger to test visibility violations
    await authenticatedPage.evaluate(() => {
      window.dispatchEvent(new Event('blur'));
    });

    // Verify warning warning modal appears
    await expect(authenticatedPage.getByText(/PROCTORING WARNING/i)).toBeVisible();

    // Click Return to Exam
    await authenticatedPage.getByRole('button', { name: /Return to Exam/i }).click();

    // Answer first question
    await authenticatedPage.getByText('Option A').first().click();

    // Navigate using the palette
    const q2Button = authenticatedPage.locator('button:has-text("2")').first();
    await expect(q2Button).toBeVisible();
    await q2Button.click();

    // Submit mock exam
    const submitBtn = authenticatedPage.getByRole('button', { name: /Submit Exam/i });
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // Assert that the scorecard summary is rendered correctly
    await expect(authenticatedPage.getByText(/Mock Attempt Scorecard/i)).toBeVisible();
    await expect(authenticatedPage.getByText(/92.5th/i)).toBeVisible();
  });
});
