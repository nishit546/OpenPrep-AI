import { describe, it, expect, vi, beforeEach } from 'vitest';
const path = require('path');

const mockNotificationService = {
  createNotification: vi.fn().mockResolvedValue(true),
};

const notificationServicePath = path.resolve(__dirname, '../../services/notificationService.js');
require.cache[notificationServicePath] = {
  id: notificationServicePath,
  filename: notificationServicePath,
  loaded: true,
  exports: mockNotificationService,
};

// Clear studyReminderCron from cache so it uses the mocked notificationService
const cronPath = path.resolve(__dirname, '../../jobs/studyReminderCron.js');
delete require.cache[cronPath];

const cron = require('node-cron');
const StudyPlan = require('../../models/StudyPlan');
const User = require('../../models/User');

let cronCallback;
vi.spyOn(cron, 'schedule').mockImplementation((pattern, callback) => {
  cronCallback = callback;
  return { start: vi.fn() };
});

const { initStudyReminderCron } = require('../../jobs/studyReminderCron');

describe('studyReminderCron unit tests', () => {
  let mockIo;

  beforeEach(() => {
    vi.clearAllMocks();
    mockIo = {};
    initStudyReminderCron(mockIo);
  });

  it('handles empty activePlans gracefully', async () => {
    vi.spyOn(StudyPlan, 'findAll').mockResolvedValue([]);

    await expect(cronCallback()).resolves.not.toThrow();
    expect(mockNotificationService.createNotification).not.toHaveBeenCalled();
  });

  it('handles plans with empty dailyGoals gracefully', async () => {
    vi.spyOn(StudyPlan, 'findAll').mockResolvedValue([
      {
        user: 'user-id-1',
        dailyGoals: null,
      },
    ]);

    await expect(cronCallback()).resolves.not.toThrow();
    expect(mockNotificationService.createNotification).not.toHaveBeenCalled();
  });

  it('does not send notification for completed tasks', async () => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    vi.spyOn(StudyPlan, 'findAll').mockResolvedValue([
      {
        user: 'user-id-1',
        dailyGoals: [
          {
            date: todayStr,
            tasks: [
              {
                title: 'Completed Task',
                completed: true,
                duration: 60,
              },
            ],
          },
        ],
      },
    ]);

    vi.spyOn(User, 'findByPk').mockResolvedValue({
      id: 'user-id-1',
      dailyReminderTime: '09:00',
    });

    await cronCallback();
    expect(mockNotificationService.createNotification).not.toHaveBeenCalled();
  });

  it('sends notification for due tasks within the 15-minute window', async () => {
    const now = new Date();
    const taskDueTime = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes from now
    const remHour = taskDueTime.getHours();
    const remMin = taskDueTime.getMinutes();
    
    // Format dailyReminderTime as HH:MM
    const dailyReminderTime = `${String(remHour).padStart(2, '0')}:${String(remMin).padStart(2, '0')}`;
    const todayStr = `${taskDueTime.getFullYear()}-${String(taskDueTime.getMonth() + 1).padStart(2, '0')}-${String(taskDueTime.getDate()).padStart(2, '0')}`;

    vi.spyOn(StudyPlan, 'findAll').mockResolvedValue([
      {
        user: 'user-id-1',
        dailyGoals: [
          {
            date: todayStr,
            tasks: [
              {
                title: 'Math Revision',
                completed: false,
                duration: 60,
              },
            ],
          },
        ],
      },
    ]);

    vi.spyOn(User, 'findByPk').mockResolvedValue({
      id: 'user-id-1',
      dailyReminderTime,
    });

    await cronCallback();

    expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
      'user-id-1',
      '⏰ Task Due Soon!',
      'Your scheduled task "Math Revision" starts in 15 minutes.',
      'task_due',
      '/study-planner',
      mockIo
    );
  });
});
