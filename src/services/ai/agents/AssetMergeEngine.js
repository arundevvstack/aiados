/**
 * AssetMergeEngine (Phase 5)
 * Prevents database pollution by detecting duplicate extracted assets 
 * (@Amara vs @amara) and mapping them to existing canonical UUIDs.
 */
export class AssetMergeEngine {
  /**
   * Evaluates a list of extracted assets against the existing workspace assets.
   * @param {Array<Object>} extractedAssets 
   * @param {Array<Object>} existingAssets 
   */
  static resolveCanonicalAssets(extractedAssets, existingAssets) {
    const resolutions = {
      newAssetsToCreate: [],
      mergedAssets: [],
      warnings: []
    };

    // Build normalized map of existing assets for quick lookup
    const existingMap = new Map();
    existingAssets.forEach(a => {
        // Strip '@', lowercase, trim spaces for normalization
        const normName = a.name.replace('@', '').toLowerCase().trim();
        existingMap.set(normName, a);
    });

    extractedAssets.forEach(extracted => {
        const normName = extracted.name.replace('@', '').toLowerCase().trim();
        
        if (existingMap.has(normName)) {
            // Duplicate detected! Map to canonical ID.
            const canonical = existingMap.get(normName);
            resolutions.mergedAssets.push({
                extractedName: extracted.name,
                canonicalId: canonical.id,
                canonicalName: canonical.name,
                type: canonical.type,
                confidence: extracted.confidence
            });
        } else {
            // Truly new asset
            if (extracted.confidence < 0.85) {
                resolutions.warnings.push(`Low confidence extraction for new asset: ${extracted.name} (${extracted.confidence}). Queuing for review.`);
            } else {
                resolutions.newAssetsToCreate.push(extracted);
                // Temporarily add to map so subsequent duplicates in the same payload are caught
                existingMap.set(normName, { name: extracted.name, type: extracted.type, id: 'pending-new' });
            }
        }
    });

    return resolutions;
  }
}
