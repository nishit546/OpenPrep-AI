const crypto = require('crypto');
const { CodeRoom, User } = require('../models');
const codeRunnerService = require('../services/codeRunnerService');

/**
 * Runs code against multiple test cases and returns execution metrics.
 */
const runCode = async (req, res) => {
  const { language, code, testCases } = req.body;

  if (!language || !code) {
    return res.status(400).json({ success: false, error: 'Language and code are required' });
  }

  const results = [];
  let passedCount = 0;

  try {
    const list = Array.isArray(testCases) ? testCases : [{ input: '', expected: '' }];

    for (const tc of list) {
      const execResult = await codeRunnerService.executeCode(language, code, tc.input || '');
      
      const actualClean = (execResult.stdout || '').trim();
      const expectedClean = (tc.expected || '').trim();
      
      let status = 'Failed';
      if (execResult.stderr && execResult.stderr.includes('Time Limit Exceeded')) {
        status = 'Time Limit Exceeded';
      } else if (execResult.stderr) {
        status = 'Runtime Error';
      } else if (actualClean === expectedClean) {
        status = 'Passed';
        passedCount++;
      }

      results.push({
        input: tc.input || '',
        expected: tc.expected || '',
        actual: execResult.stdout || '',
        stderr: execResult.stderr || '',
        status,
        time: execResult.time,
        memory: execResult.memory,
      });
    }

    return res.json({
      success: true,
      total: list.length,
      passed: passedCount,
      results,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Creates a collaborative coding room.
 */
const createRoom = async (req, res) => {
  const { title, language } = req.body;

  if (!title) {
    return res.status(400).json({ success: false, error: 'Room title is required' });
  }

  try {
    const inviteCode = crypto.randomBytes(4).toString('hex'); // 8 character code
    const room = await CodeRoom.create({
      title,
      language: language || 'javascript',
      inviteCode,
      userId: req.user.id,
      code: '',
    });

    return res.status(201).json({
      success: true,
      room,
      shareLink: `/code/room/${inviteCode}`,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Gets code room details by invite code.
 */
const getRoom = async (req, res) => {
  const { inviteCode } = req.params;

  try {
    const room = await CodeRoom.findOne({
      where: { inviteCode },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'avatarUrl'],
        },
      ],
    });

    if (!room) {
      return res.status(404).json({ success: false, error: 'Coding room not found' });
    }

    return res.json({ success: true, room });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  runCode,
  createRoom,
  getRoom,
};
