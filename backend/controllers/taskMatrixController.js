/**
 * @fileoverview Controller for managing tasks and the Eisenhower Matrix.
 */
const taskPrioritizationService = require('../services/taskPrioritizationService');
// const Task = require('../models/Task');

/**
 * Creates a new task with AI-assisted categorization.
 */
const createTask = async (req, res) => {
    try {
        const { title, description, deadline } = req.body;
        // const userId = req.user.id;

        if (!title || !description) {
            return res.status(400).json({ success: false, message: 'Title and description are required.' });
        }

        const analysis = await taskPrioritizationService.analyzeTask(description, deadline);

        // Mock DB creation
        const newTask = {
            id: `task_${Date.now()}`,
            title,
            description,
            deadline: deadline || null,
            quadrant: analysis.quadrant,
            quadrantName: analysis.quadrantName,
            estimatedTimeMinutes: analysis.estimatedTimeMinutes,
            reasoning: analysis.reasoning,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        res.status(201).json({ success: true, data: newTask });
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * Fetches all tasks for the user's matrix.
 */
const getTasks = async (req, res) => {
    try {
        // Mock tasks
        const mockTasks = [
            { id: 't1', title: 'Finish Calculus Homework', description: 'Complete problems 1-20', deadline: '2023-11-01', quadrant: 1, quadrantName: 'Do First', estimatedTimeMinutes: 90, status: 'pending' },
            { id: 't2', title: 'Review Biology Notes', description: 'Go over chapter 4', deadline: '2023-11-15', quadrant: 2, quadrantName: 'Schedule', estimatedTimeMinutes: 45, status: 'pending' },
            { id: 't3', title: 'Format Bibliography', description: 'Fix APA citations', deadline: '2023-11-02', quadrant: 3, quadrantName: 'Delegate', estimatedTimeMinutes: 30, status: 'pending' }
        ];

        res.status(200).json({ success: true, data: mockTasks });
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * Updates a task's quadrant or status (e.g., drag and drop result).
 */
const updateTask = async (req, res) => {
    try {
        const { id } = req.params;
        const { quadrant, status } = req.body;

        // Mock DB update
        res.status(200).json({
            success: true,
            message: 'Task updated successfully.',
            data: { id, quadrant, status }
        });
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * Deletes a task.
 */
const deleteTask = async (req, res) => {
    try {
        const { id } = req.params;

        // Mock DB deletion
        res.status(200).json({ success: true, message: 'Task deleted successfully.' });
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = {
    createTask,
    getTasks,
    updateTask,
    deleteTask,
};
