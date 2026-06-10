/**
 * ADGRAVITY OS — CampaignOrchestrator
 * 
 * Master pipeline coordinator. Executes the full production pipeline:
 * Story → Script → Asset Extraction → Visual Identity → Shot Planning → Render Queue
 * 
 * Features:
 * - CheckpointEngine: Pipeline is resumable. A failed stage does not restart from scratch.
 * - Halt on failure: No silent continuation. If any stage fails, the pipeline stops immediately.
 * - AutoApprovalEngine: High-confidence outputs skip human review automatically.
 * - Event callbacks: onStageComplete, onStageFailed for real-time UI updates.
 */

import { CheckpointEngine, CheckpointStatus } from './CheckpointEngine.js';
import { AutoApprovalEngine } from './AutoApprovalEngine.js';

export const PipelineStage = {
  STORY: 'story_generation',
  SCRIPT: 'script_generation',
  ASSET_EXTRACTION: 'asset_extraction',
  VISUAL_IDENTITY: 'visual_identity',
  SHOT_PLANNING: 'shot_planning',
  RENDER_QUEUE: 'render_queue',
};

export class CampaignOrchestrator {
  /**
   * @param {Object} config
   * @param {string} config.campaignId - Unique campaign identifier
   * @param {string} config.projectId
   * @param {string} config.workspaceId
   * @param {Object} config.brandBrief - Initial brand brief input
   * @param {Object} [config.callbacks] - { onStageStart, onStageComplete, onStageFailed, onComplete }
   */
  constructor(config) {
    this.campaignId = config.campaignId;
    this.projectId = config.projectId;
    this.workspaceId = config.workspaceId;
    this.brandBrief = config.brandBrief;
    this.callbacks = config.callbacks || {};
    this.checkpoint = new CheckpointEngine(config.campaignId, config.workspaceId);
    this.context = {}; // Accumulated pipeline context passed between stages
  }

  /**
   * Execute the full pipeline. Resume from last checkpoint if previously failed.
   * @returns {Promise<{ success: boolean, checkpoints: Object, context: Object }>}
   */
  async run() {
    console.log(`[CampaignOrchestrator] Campaign ${this.campaignId} starting...`);

    // Load existing checkpoints (resume support)
    await this.checkpoint.load();

    // Define ordered pipeline stages
    const stages = [
      { name: PipelineStage.STORY,            fn: () => this._generateStory() },
      { name: PipelineStage.SCRIPT,           fn: () => this._generateScript() },
      { name: PipelineStage.ASSET_EXTRACTION, fn: () => this._extractAssets() },
      { name: PipelineStage.VISUAL_IDENTITY,  fn: () => this._buildVisualIdentity() },
      { name: PipelineStage.SHOT_PLANNING,    fn: () => this._planShots() },
      { name: PipelineStage.RENDER_QUEUE,     fn: () => this._queueRenders() },
    ];

    for (const stage of stages) {
      // Skip already-completed stages (resume support)
      if (this.checkpoint.isCompleted(stage.name)) {
        const previousOutput = this.checkpoint.getOutput(stage.name);
        this.context[stage.name] = previousOutput;
        console.log(`[CampaignOrchestrator] Stage "${stage.name}" already completed. Skipping.`);
        continue;
      }

      await this.checkpoint.start(stage.name);
      this.callbacks.onStageStart?.(stage.name);

      try {
        const output = await stage.fn();

        // Run auto-approval evaluation if output has consistency data
        if (output && output.consistencyScore !== undefined) {
          const approval = AutoApprovalEngine.evaluate(output);
          output.autoApproved = approval.approved;
          output.approvalReason = approval.reason;
        }

        await this.checkpoint.complete(stage.name, output);
        this.context[stage.name] = output;
        this.callbacks.onStageComplete?.(stage.name, output);

      } catch (err) {
        // HALT: No silent continuation on failure
        await this.checkpoint.fail(stage.name, err.message);
        this.callbacks.onStageFailed?.(stage.name, err.message);

        const summary = this.checkpoint.getSummary();
        console.error(`[CampaignOrchestrator] Pipeline halted at stage: "${stage.name}"`);

        return {
          success: false,
          haltedAt: stage.name,
          reason: err.message,
          checkpoints: summary.checkpoints,
          context: this.context,
        };
      }
    }

    console.log(`[CampaignOrchestrator] Campaign ${this.campaignId} completed successfully.`);
    this.callbacks.onComplete?.(this.context);

    return {
      success: true,
      checkpoints: this.checkpoint.getSummary().checkpoints,
      context: this.context,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Stage Implementations (mock-ready; wire to real services)
  // ─────────────────────────────────────────────────────────────

  async _generateStory() {
    // TODO: Wire to StoryGeneratorAgent
    console.log('[Stage] Generating story from brand brief...');
    return {
      storyId: `story_${Date.now()}`,
      concept: this.brandBrief.concept,
      tone: this.brandBrief.tone,
      consistencyScore: 100,
      hardFailFlags: [],
      identityMatchScore: 100,
      brandComplianceScore: 100,
      dependencyValidationPassed: true,
    };
  }

  async _generateScript() {
    // TODO: Wire to ScriptGeneratorAgent
    console.log('[Stage] Generating script from story...');
    const story = this.context[PipelineStage.STORY];
    if (!story?.storyId) throw new Error('Story output missing. Cannot generate script.');

    return {
      scriptId: `script_${Date.now()}`,
      storyId: story.storyId,
      sceneCount: 3,
    };
  }

  async _extractAssets() {
    // TODO: Wire to AssetExtractionAgent
    console.log('[Stage] Extracting assets from script...');
    const script = this.context[PipelineStage.SCRIPT];
    if (!script?.scriptId) throw new Error('Script output missing. Cannot extract assets.');

    return {
      assetCount: 0,
      characters: [],
      locations: [],
      props: [],
    };
  }

  async _buildVisualIdentity() {
    // TODO: Wire to VisualIdentityEngine
    console.log('[Stage] Building visual identity manifest...');
    return {
      manifestId: `manifest_${Date.now()}`,
      status: 'draft',
    };
  }

  async _planShots() {
    // TODO: Wire to ShotPlanningEngine
    console.log('[Stage] Planning cinematic shots...');
    return {
      shotCount: 0,
      shots: [],
    };
  }

  async _queueRenders() {
    // TODO: Wire to RenderQueueEngine
    console.log('[Stage] Queuing render jobs...');
    const shots = this.context[PipelineStage.SHOT_PLANNING]?.shots || [];

    return {
      jobsQueued: shots.length,
      jobIds: [],
    };
  }
}
