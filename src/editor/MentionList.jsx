import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react'

export default forwardRef((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectItem = index => {
    const item = props.items[index]
    if (item) {
      props.command({
        id: item.id,
        label: item.name,
        assetType: item.type,
        version: item.version || 1,
        workspaceId: item.workspace_id,
        projectId: item.project_id
      })
    }
  }

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length)
  }

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length)
  }

  const enterHandler = () => {
    selectItem(selectedIndex)
  }

  useEffect(() => setSelectedIndex(0), [props.items])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') {
        upHandler()
        return true
      }

      if (event.key === 'ArrowDown') {
        downHandler()
        return true
      }

      if (event.key === 'Enter') {
        enterHandler()
        return true
      }

      return false
    },
  }))

  return (
    <div className="mention-dropdown glass-panel" style={{ minWidth: '250px', padding: '8px', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
      {props.items.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {props.items.map((item, index) => (
            <button
              className={`mention-item ${index === selectedIndex ? 'selected' : ''}`}
              key={index}
              onClick={() => selectItem(index)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 12px',
                borderRadius: '8px',
                background: index === selectedIndex ? 'rgba(255,255,255,0.1)' : 'transparent',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              {/* Thumbnail Placeholder */}
              <div style={{ width: '32px', height: '32px', borderRadius: '4px', background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '10px', fontWeight: 'bold' }}>IMG</span>
              </div>
              
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>@{item.name}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.type} • v{item.version || 1}</div>
              </div>
              
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                <div>{item.usage_count || 0} uses</div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          No assets found
        </div>
      )}
    </div>
  )
})
