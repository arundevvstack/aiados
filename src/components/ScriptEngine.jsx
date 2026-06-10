import React from 'react';
import { useMemory } from '../context/GlobalMemoryContext';
import { Play, MapPin, Users } from 'lucide-react';

export default function ScriptEngine() {
  const { scripts, getAssetDetails, setSelectedAsset } = useMemory();

  // Smart @ parser function
  const renderSmartText = (text) => {
    const parts = text.split(/(@\w+)/g);
    
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const asset = getAssetDetails(part);
        if (asset) {
          let color = 'var(--primary-color)';
          if (asset.type === 'location') color = 'var(--secondary-color)';
          if (asset.type === 'prop' || asset.type === 'wardrobe') color = 'var(--highlight-color)';

          return (
            <span 
              key={i} 
              style={{
                color: color,
                backgroundColor: `${color}22`,
                padding: '2px 6px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
              onClick={() => setSelectedAsset(asset)}
              title={`Click to view ${asset.name} in Context Panel`}
            >
              {part}
            </span>
          );
        }
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="p-6">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Script Engine</h1>
        <button style={{ backgroundColor: 'var(--primary-color)', color: 'white', padding: '8px 16px', borderRadius: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Play size={16} />
          Convert Story To Script
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {scripts.map(scene => (
          <div key={scene.id} style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '32px', borderRadius: '16px', border: '1px solid var(--panel-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--panel-border)', paddingBottom: '16px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <span style={{ fontSize: '1.25rem', fontFamily: 'var(--font-heading)', color: 'var(--primary-color)' }}>SCENE 0{scene.sceneNumber}</span>
                <span style={{ color: 'var(--text-muted)' }}>•</span>
                <span style={{ display: 'flex', gap: '4px', alignItems: 'center', color: 'var(--secondary-color)' }}>
                  <MapPin size={16} /> {renderSmartText(scene.location)}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <span style={{ display: 'flex', gap: '4px', alignItems: 'center', color: 'var(--text-muted)' }}>
                  <Users size={16} /> {scene.characters.map((c, idx) => <React.Fragment key={idx}>{renderSmartText(c)}</React.Fragment>)}
                </span>
              </div>
            </div>

            <div style={{ fontSize: '1.125rem', lineHeight: '1.6', color: 'var(--text-main)', fontFamily: 'var(--font-serif)' }}>
              {renderSmartText(scene.action)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
