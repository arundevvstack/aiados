import { supabase } from '../../lib/supabase.js';
import crypto from 'crypto';

import { MockOpenAIAdapter } from './providers/MockOpenAIAdapter.js';
import { MockAnthropicAdapter } from './providers/MockAnthropicAdapter.js';
import { MockGeminiAdapter } from './providers/MockGeminiAdapter.js';

import { OpenAIAdapter } from './providers/OpenAIAdapter.js';
import { AnthropicAdapter } from './providers/AnthropicAdapter.js';
import { GeminiAdapter } from './providers/GeminiAdapter.js';

/**
 * AIGatewayService (Phase 4)
 * Orchestrates job creation, provider routing, failover, and audit trails.
 */
export class AIGatewayService {
  /**
   * Main entry point for processing an AI Job request.
   * @param {Object} jobRequest { workspaceId, projectId, promptPackage, primaryProvider, fallbackProvider }
   */
  static async routeJob(jobRequest) {
    const routingStart = process.hrtime();
    const { workspaceId, projectId, promptPackage, primaryProvider, fallbackProvider, userId } = jobRequest;

    // 1. Fetch Model/Provider Config
    let modePrefix = '';
    if (process.env.AI_PROVIDER_MODE === 'mock') {
        // Swap to mock counterparts for test routing
        modePrefix = 'mock_';
    }

    const { data: models, error: mErr } = await supabase.from('provider_capabilities')
        .select('*')
        .in('provider', [primaryProvider.replace('mock_', ''), fallbackProvider ? fallbackProvider.replace('mock_', '') : null]);
    if (mErr) throw mErr;

    const primaryModel = models.find(m => m.provider === primaryProvider.replace('mock_', ''));
    const fallbackModel = fallbackProvider ? models.find(m => m.provider === fallbackProvider.replace('mock_', '')) : null;

    if (!primaryModel) throw new Error(`Model configuration not found for provider: ${primaryProvider}`);
    
    // Patch provider names for internal mocking
    const execPrimaryModel = { ...primaryModel, provider: modePrefix + primaryModel.provider };
    const execFallbackModel = fallbackModel ? { ...fallbackModel, provider: modePrefix + fallbackModel.provider } : null;

    if (!primaryModel) throw new Error(`Model configuration not found for provider: ${primaryProvider}`);

    // 2. Create Initial Job Record
    const { data: job, error: jErr } = await supabase.from('ai_jobs').insert([{
        workspace_id: workspaceId,
        project_id: projectId,
        job_type: 'generation',
        provider: execPrimaryModel.provider,
        model: execPrimaryModel.model,
        status: 'pending',
        created_by: userId
    }]).select().single();
    if (jErr) throw jErr;

    const routingMs = this.getMs(routingStart);

    try {
        // 3. Attempt Execution
        let result;
        try {
            const adapter = this.getAdapter(execPrimaryModel);
            result = await adapter.execute(promptPackage);
        } catch (error) {
            // 4. Handle Failover Logic
            if (execFallbackModel && this.isRetryable(error)) {
                console.warn(`[Failover] Primary failed: ${error.message}. Routing to ${execFallbackModel.provider}`);
                await supabase.from('ai_jobs').update({ status: 'failover_processing', provider: execFallbackModel.provider, model: execFallbackModel.model }).eq('id', job.id);
                
                const fallbackAdapter = this.getAdapter(execFallbackModel);
                result = await fallbackAdapter.execute(promptPackage);
            } else {
                throw error;
            }
        }

        // 5. Success Path - Store Audit Hash
        const providerHash = crypto.createHash('sha256').update(result.provider + result.model).digest('hex');
        const resultHash = crypto.createHash('sha256').update(JSON.stringify(result.response)).digest('hex');

        await supabase.from('ai_audit_trail').insert([{
            job_id: job.id,
            graph_hash: promptPackage.memoryContext.metadata.graph_hash || 'none',
            compression_hash: promptPackage.memoryContext.metadata.compressed_at ? crypto.createHash('sha256').update(JSON.stringify(promptPackage.memoryContext)).digest('hex') : 'none',
            prompt_hash: promptPackage.audit.prompt_hash,
            provider_hash: providerHash,
            result_hash: resultHash
        }]);

        // 6. Update Job Record
        await supabase.from('ai_jobs').update({
            status: 'completed',
            input_tokens: result.inputTokens,
            output_tokens: result.outputTokens,
            cost: result.cost,
            request_payload: promptPackage,
            response_payload: result.response,
            routing_ms: routingMs,
            latency_ms: result.latency,
            completed_at: new Date().toISOString()
        }).eq('id', job.id);

        return result;

    } catch (finalError) {
        // Update Job as Failed
        await supabase.from('ai_jobs').update({
            status: 'failed',
            response_payload: { error: finalError.message },
            routing_ms: routingMs,
            completed_at: new Date().toISOString()
        }).eq('id', job.id);

        throw finalError;
    }
  }

  static getAdapter(modelDetails) {
    switch (modelDetails.provider) {
        case 'mock_openai': return new MockOpenAIAdapter(modelDetails);
        case 'mock_anthropic': return new MockAnthropicAdapter(modelDetails);
        case 'mock_gemini': return new MockGeminiAdapter(modelDetails);
        case 'openai': return new OpenAIAdapter(modelDetails);
        case 'anthropic': return new AnthropicAdapter(modelDetails);
        case 'gemini': return new GeminiAdapter(modelDetails);
        default: throw new Error(`No adapter for provider: ${modelDetails.provider}`);
    }
  }

  static isRetryable(error) {
    const msg = error.message || '';
    return msg.includes('429') || msg.includes('500') || msg.includes('Timeout');
  }

  static getMs(hrTimeStart) {
    const diff = process.hrtime(hrTimeStart);
    return Math.round((diff[0] * 1000) + (diff[1] / 1000000));
  }
}
