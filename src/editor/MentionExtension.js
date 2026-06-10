import { mergeAttributes, Node } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import Suggestion from '@tiptap/suggestion'

export default Node.create({
  name: 'mention',

  group: 'inline',

  inline: true,

  selectable: false,

  atom: true,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: element => element.getAttribute('data-id'),
        renderHTML: attributes => {
          if (!attributes.id) {
            return {}
          }
          return { 'data-id': attributes.id }
        },
      },
      label: {
        default: null,
        parseHTML: element => element.getAttribute('data-label'),
        renderHTML: attributes => {
          if (!attributes.label) {
            return {}
          }
          return { 'data-label': attributes.label }
        },
      },
      assetType: {
        default: null,
        parseHTML: element => element.getAttribute('data-asset-type'),
        renderHTML: attributes => {
          if (!attributes.assetType) {
            return {}
          }
          return { 'data-asset-type': attributes.assetType }
        },
      },
      version: {
        default: 1,
        parseHTML: element => element.getAttribute('data-version'),
        renderHTML: attributes => {
          if (!attributes.version) {
            return {}
          }
          return { 'data-version': attributes.version }
        },
      },
      workspaceId: {
        default: null,
        parseHTML: element => element.getAttribute('data-workspace-id'),
        renderHTML: attributes => {
          if (!attributes.workspaceId) {
            return {}
          }
          return { 'data-workspace-id': attributes.workspaceId }
        },
      },
      projectId: {
        default: null,
        parseHTML: element => element.getAttribute('data-project-id'),
        renderHTML: attributes => {
          if (!attributes.projectId) {
            return {}
          }
          return { 'data-project-id': attributes.projectId }
        },
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="mention"]',
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes({ 'data-type': 'mention' }, HTMLAttributes, { class: 'mention-node glassmorphic-badge' }),
      `@${node.attrs.label}`
    ]
  },

  renderText({ node }) {
    return `@${node.attrs.label}`
  },

  addKeyboardShortcuts() {
    return {
      Backspace: () => this.editor.commands.command(({ tr, state }) => {
        let isMention = false
        const { selection } = state
        const { empty, anchor } = selection

        if (!empty) {
          return false
        }

        state.doc.nodesBetween(anchor - 1, anchor, (node, pos) => {
          if (node.type.name === this.name) {
            isMention = true
            tr.insertText('', pos, pos + node.nodeSize)
            return false
          }
        })

        return isMention
      }),
    }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ]
  },
})
