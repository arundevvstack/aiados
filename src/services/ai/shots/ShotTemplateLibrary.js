/**
 * ShotTemplateLibrary (Phase 7)
 * Baseline cinematic templates for standard commercial patterns.
 */
export class ShotTemplateLibrary {
  static getTemplate(name) {
      const templates = {
          luxury_commercial: {
              establishing: { shotType: 'wide_shot', lens: '35mm', cameraMovement: 'slow_pan' },
              product_hero: { shotType: 'close_up', lens: '85mm', cameraMovement: 'static' },
              lifestyle: { shotType: 'medium_shot', lens: '50mm', cameraMovement: 'tracking' }
          }
      };
      
      return templates[name] || null;
  }
}
