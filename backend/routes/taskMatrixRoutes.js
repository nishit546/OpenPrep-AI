/**
 * @fileoverview API routes for Smart Task Prioritization and Eisenhower Matrix.
 */
const express = require('express');
const router = express.Router();
const taskMatrixController = require('../controllers/taskMatrixController');

/**
 * @route   POST /api/tasks
 * @desc    Create a new task with AI-assisted categorization
 * @access  Private
 */
router.post('/', taskMatrixController.createTask);

/**
 * @route   GET /api/tasks
 * @desc    Fetch all tasks for the Eisenhower Matrix
 * @access  Private
 */
router.get('/', taskMatrixController.getTasks);

/**
 * @route   PUT /api/tasks/:id
 * @desc    Update a task's quadrant or status
 * @access  Private
 */
router.put('/:id', taskMatrixController.updateTask);

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Delete a task
 * @access  Private
 */
router.delete('/:id', taskMatrixController.deleteTask);

module.exports = router;
