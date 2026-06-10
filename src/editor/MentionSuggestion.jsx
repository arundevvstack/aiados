import { ReactRenderer } from '@tiptap/react'
import tippy from 'tippy.js'
import MentionList from './MentionList'
import { AssetService } from '../services/assetService'

// Default generic workspace_id for prototyping before context integration
let currentWorkspaceId = null;

export const setWorkspaceForMentions = (workspaceId) => {
  currentWorkspaceId = workspaceId;
}

export default {
  items: async ({ query }) => {
    if (!currentWorkspaceId) return [];
    
    try {
      const results = await AssetService.searchAssets(currentWorkspaceId, null, { search: query });
      return results.map(asset => ({
        ...asset,
        version: asset.version || 1, // Will be driven by version engine later
        usage_count: 0 // Will be driven by usageSyncService later
      })).slice(0, 10);
    } catch (e) {
      console.error('Mention query failed:', e);
      return [];
    }
  },

  render: () => {
    let component
    let popup

    return {
      onStart: props => {
        component = new ReactRenderer(MentionList, {
          props,
          editor: props.editor,
        })

        if (!props.clientRect) {
          return
        }

        popup = tippy('body', {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
        })
      },

      onUpdate(props) {
        component.updateProps(props)

        if (!props.clientRect) {
          return
        }

        popup[0].setProps({
          getReferenceClientRect: props.clientRect,
        })
      },

      onKeyDown(props) {
        if (props.event.key === 'Escape') {
          popup[0].hide()
          return true
        }

        return component.ref?.onKeyDown(props)
      },

      onExit() {
        popup[0].destroy()
        component.destroy()
      },
    }
  },
}
