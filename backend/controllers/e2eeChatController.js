/**
 * @fileoverview Controller for End-to-End Encrypted Group Study Chat metadata
 */

/**
 * Create a new E2EE Group Study Room Session
 * @route POST /api/e2ee-chat/create-vault
 * @access Private
 */
exports.createE2EERoom = async (req, res, next) => {
  try {
    const { roomName, defaultTtlSeconds = 300 } = req.body;

    const roomId = 'vault-' + Math.random().toString(36).substring(2, 10);

    return res.status(201).json({
      success: true,
      data: {
        roomId,
        roomName: roomName || 'E2EE Study Room',
        defaultTtlSeconds: Number(defaultTtlSeconds) || 300,
        createdAt: new Date().toISOString(),
        zeroKnowledge: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get room metadata for an active E2EE room
 * @route GET /api/e2ee-chat/room-info/:roomId
 * @access Private
 */
exports.getE2EERoomInfo = async (req, res, next) => {
  try {
    const { roomId } = req.params;

    return res.status(200).json({
      success: true,
      data: {
        roomId,
        isE2EE: true,
        cipherAlgorithm: 'AES-GCM-256',
        keyDerivation: 'PBKDF2-SHA256',
        zeroKnowledgeServer: true,
      },
    });
  } catch (error) {
    next(error);
  }
};
