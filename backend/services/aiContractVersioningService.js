const AIWorkflowContract = require('../models/AIWorkflowContract');
const AIArtifactVersion = require('../models/AIArtifactVersion');
const Ajv = require('ajv');
const logger = require('../utils/logger');

const ajv = new Ajv();

class AIContractVersioningService {
  /**
   * Register or update an AI workflow contract
   */
  static async registerContract(workflowType, promptTemplate, schema, modelConfig, parsingStrategy, validationRules = null) {
    try {
      const latestVersion = await AIWorkflowContract.findOne({
        where: { workflowType },
        order: [['version', 'DESC']],
      });

      const nextVersion = latestVersion ? latestVersion.version + 1 : 1;

      const contract = await AIWorkflowContract.create({
        workflowType,
        version: nextVersion,
        promptTemplate,
        expectedResponseSchema: schema,
        modelConfig,
        parsingStrategy,
        validationRules,
        isActive: true,
      });

      logger.info(`Contract registered: ${workflowType} v${nextVersion}`);
      return contract;
    } catch (error) {
      logger.error(`Failed to register contract: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get the active contract for a workflow type
   */
  static async getActiveContract(workflowType) {
    const contract = await AIWorkflowContract.findOne({
      where: { workflowType, isActive: true },
      order: [['version', 'DESC']],
    });

    if (!contract) {
      throw new Error(`No active contract found for workflow: ${workflowType}`);
    }

    return contract;
  }

  /**
   * Get specific contract by version
   */
  static async getContractByVersion(workflowType, version) {
    return AIWorkflowContract.findOne({
      where: { workflowType, version },
    });
  }

  /**
   * Validate response against contract schema
   */
  static validateResponseSchema(response, schema) {
    try {
      const validate = ajv.compile(schema);
      const isValid = validate(response);

      if (!isValid) {
        return {
          valid: false,
          errors: validate.errors,
        };
      }

      return { valid: true, errors: null };
    } catch (error) {
      logger.error(`Schema validation error: ${error.message}`);
      return {
        valid: false,
        errors: [{ message: 'Schema validation failed', detail: error.message }],
      };
    }
  }

  /**
   * Record an AI artifact with contract version for traceability
   */
  static async recordArtifact(artifactId, artifactType, contractId, contractVersion, promptInput, rawResponse, parsedOutput, validationStatus, validationErrors = null) {
    try {
      const artifact = await AIArtifactVersion.create({
        artifactId,
        artifactType,
        contractId,
        contractVersion,
        promptInput,
        rawResponse,
        parsedOutput,
        validationStatus,
        validationErrors,
      });

      logger.info(`Artifact recorded: ${artifactId} with contract v${contractVersion}`);
      return artifact;
    } catch (error) {
      logger.error(`Failed to record artifact: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get artifact history with contract versions
   */
  static async getArtifactHistory(artifactId) {
    return AIArtifactVersion.findAll({
      where: { artifactId },
      order: [['generatedAt', 'DESC']],
      include: [
        {
          association: 'contract',
          model: AIWorkflowContract,
        },
      ],
    });
  }

  /**
   * Validate and handle version compatibility
   */
  static async validateAgainstContractVersion(response, contractVersion, fallbackToLatest = false) {
    try {
      const schemaValid = this.validateResponseSchema(response, contractVersion.expectedResponseSchema);

      if (!schemaValid.valid && fallbackToLatest) {
        logger.warn(`Response invalid for contract v${contractVersion.version}, attempting with latest`);
        // Attempt with latest version
        return { compatible: false, requiresMigration: true };
      }

      return { compatible: schemaValid.valid, errors: schemaValid.errors };
    } catch (error) {
      logger.error(`Contract validation failed: ${error.message}`);
      return { compatible: false, errors: [error.message] };
    }
  }
}

module.exports = AIContractVersioningService;