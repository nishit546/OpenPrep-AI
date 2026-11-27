'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('StudyPlans');
    if (!columns.overallStrategy) {
      await queryInterface.addColumn('StudyPlans', 'overallStrategy', {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const columns = await queryInterface.describeTable('StudyPlans');
    if (columns.overallStrategy) await queryInterface.removeColumn('StudyPlans', 'overallStrategy');
  },
};
