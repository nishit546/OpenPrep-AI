/**
 * @fileoverview Service for generating AI-powered dynamic study plans.
 * Utilizes the Gemini API to distribute syllabus topics intelligently based on exam date and daily constraints.
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
const geminiService = require('./geminiService');
const AIContractVersioningService = require('./aiContractVersioningService');
const AIGenerationCacheService = require('./aiGenerationCacheService');
/**
 * Generates a structured, day-by-day study schedule.
 * 
 * @param {string} examDate - The target exam date (ISO string).
 * @param {string[]} topics - Array of syllabus topics to cover.
 * @param {number} dailyHours - Available study hours per day.
 * @returns {Promise<Object>} The generated study plan in JSON format.
 */
async function generateStudyPlan(examDate, topics, dailyHours) {
    try {
        const prompt = `
      You are an expert academic planner. Create a day-by-day study plan.
      Exam Date: ${examDate}
      Topics to cover: ${topics.join(', ')}
      Available study hours per day: ${dailyHours}

      Return a STRICT JSON object with the following schema. Do not include markdown formatting or extra text:
      {
        "totalDays": number,
        "schedule": [
          {
            "date": "YYYY-MM-DD",
            "topics": ["topic1", "topic2"],
            "estimatedHours": number,
            "focusArea": "string (e.g., Revision, Deep Dive, Practice)",
            "notes": "string (brief motivational or strategic note)"
          }
        ],
        "overallStrategy": "string (1-2 sentences summarizing the approach)"
      }
      Ensure the dates progress logically up to the exam date and the estimatedHours do not exceed the dailyHours limit.
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const cleanJson = response.text().replace(/```json\n?|\n?```/g, '').trim();

        return JSON.parse(cleanJson);
    } catch (error) {
        console.error('Error generating study plan:', error.message);
        throw new Error('Failed to generate study plan. Please check your inputs and try again.');
    }
}

/**
 * Creates an immutable version of a study plan
 * @param {string} studyPlanId - The study plan ID
 * @param {string} reason - Reason for creating version
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} The created version
 */
async function createPlanVersion(studyPlanId, reason, metadata = {}) {
  const { StudyPlanVersion, PlanRevisionMetadata } = require('../models');
  // Check cache first
const cacheKey = AIGenerationCacheService.generateFingerprint('study-plan', {
  content: topics,
  parameters: { timeframe, ...options },
  contractVersion: contract.version,
  modelConfig: contract.modelConfig,
});

const cached = await AIGenerationCacheService.getCachedResult(
  cacheKey.fingerprint,
  userId,
  contract.version
);

let studyPlan;
if (cached) {
  studyPlan = JSON.parse(cached.result);
} else {
  studyPlan = await geminiService.generateStudyPlan(topics, timeframe, options);
  await AIGenerationCacheService.cacheResult(
    cacheKey.fingerprint,
    'study-plan',
    userId,
    contract.version,
    cacheKey.inputHash,
    JSON.stringify(studyPlan),
    { model: 'gemini-pro', timeframe, topicCount: topics.length }
  );
}
  try {
    const lastVersion = await StudyPlanVersion.findOne({
      where: { studyPlanId },
      order: [['versionNumber', 'DESC']],
    });

    const newVersionNumber = (lastVersion?.versionNumber || 0) + 1;

    const version = await StudyPlanVersion.create({
      studyPlanId,
      versionNumber: newVersionNumber,
      isActive: true,
    });

    if (lastVersion) {
      await lastVersion.update({ isActive: false });
    }

    await PlanRevisionMetadata.create({
      versionId: version.id,
      revisionReason: reason,
      ...metadata,
    });

    return version;
  } catch (error) {
    console.error('Error creating plan version:', error.message);
    throw new Error('Failed to create plan version');
  }
}

/**
 * Identifies which tasks need rescheduling based on changes
 * @param {Object} currentPlan - Current study plan
 * @param {Object} newParams - New plan parameters
 * @returns {Promise<Array>} List of tasks requiring rescheduling
 */
async function identifyAffectedTasks(currentPlan, newParams) {
  const { StudyTask, StudyPlanVersion } = require('../models');
  
  try {
    const activeVersion = await StudyPlanVersion.findOne({
      where: { studyPlanId: currentPlan.id, isActive: true },
    });

    if (!activeVersion) return [];

    const tasks = await StudyTask.findAll({
      where: { versionId: activeVersion.id },
    });

    const affectedTasks = [];
    for (const task of tasks) {
      if (task.completionStatus === 'completed' || task.isLocked) continue;
      affectedTasks.push(task);
    }

    return affectedTasks;
  } catch (error) {
    console.error('Error identifying affected tasks:', error.message);
    throw new Error('Failed to identify affected tasks');
  }
}

/**
 * Incrementally reschedules only the necessary future tasks
 * @param {string} studyPlanId - Study plan ID
 * @param {Object} newExamDate - New exam date
 * @param {number} newDailyHours - New daily study hours
 * @returns {Promise<Object>} Rescheduling results
 */
async function incrementallyReschedule(studyPlanId, newExamDate, newDailyHours) {
  const { StudyPlan, StudyTask, StudyPlanVersion } = require('../models');
  
  try {
    const plan = await StudyPlan.findByPk(studyPlanId);
    if (!plan) throw new Error('Study plan not found');

    const affectedTasks = await identifyAffectedTasks(plan, { newExamDate, newDailyHours });
    if (affectedTasks.length === 0) {
      return { message: 'No tasks to reschedule', changedCount: 0 };
    }

    const newTopics = affectedTasks.map(t => t.topic);
    const daysUntilExam = Math.ceil(
      (new Date(newExamDate) - new Date()) / (1000 * 60 * 60 * 24)
    );

    const rescheduledPlan = await generateStudyPlan(
      newExamDate.toISOString(),
      newTopics,
      newDailyHours
    );

    const updatePromises = [];
    for (let i = 0; i < affectedTasks.length && i < rescheduledPlan.schedule.length; i++) {
      updatePromises.push(
        affectedTasks[i].update({
          scheduledDate: new Date(rescheduledPlan.schedule[i].date),
          estimatedHours: rescheduledPlan.schedule[i].estimatedHours,
        })
      );
    }

    await Promise.all(updatePromises);

    return {
      message: 'Rescheduling complete',
      changedCount: affectedTasks.length,
      preservedCount: (await StudyTask.count({ where: { versionId: (await StudyPlanVersion.findOne({ where: { studyPlanId, isActive: true } })).id } })) - affectedTasks.length,
    };
  } catch (error) {
    console.error('Error during incremental rescheduling:', error.message);
    throw new Error('Failed to reschedule plan');
  }
}

/**
 * Retrieves a specific plan version
 * @param {string} versionId - Version ID
 * @returns {Promise<Object>} Plan version with tasks
 */
async function getPlanVersion(versionId) {
  const { StudyPlanVersion, StudyTask } = require('../models');
  
  try {
    const version = await StudyPlanVersion.findByPk(versionId);
    if (!version) throw new Error('Version not found');

    const tasks = await StudyTask.findAll({ where: { versionId } });
    
    return { version, tasks };
  } catch (error) {
    console.error('Error fetching plan version:', error.message);
    throw new Error('Failed to fetch plan version');
  }
}

module.exports = {
    generateStudyPlan,
    createPlanVersion,
    identifyAffectedTasks,
    incrementallyReschedule,
    getPlanVersion,
};