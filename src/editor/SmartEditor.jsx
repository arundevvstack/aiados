import React, { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import History from '@tiptap/extension-history'
import Typography from '@tiptap/extension-typography'
import Link from '@tiptap/extension-link'
import MentionExtension from './MentionExtension'
import suggestion, { setWorkspaceForMentions } from './MentionSuggestion'

const SmartEditor = ({ 
  initialContent = '', 
  workspaceId, 
  onUpdate = () => {} 
}) => {
  // Pass workspace scope to the mention resolver
  useEffect(() => {
    if (workspaceId) {
      setWorkspaceForMentions(workspaceId)
    }
  }, [workspaceId])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false, // Using dedicated history extension
      }),
      Placeholder.configure({
        placeholder: 'Command AI with /, or mention an asset with @...',
      }),
      CharacterCount,
      History,
      Typography,
      Link.configure({
        openOnClick: false,
      }),
      MentionExtension.configure({
        HTMLAttributes: {
          class: 'mention-node',
        },
        suggestion,
      }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      // Pass JSON and HTML back to parent component
      onUpdate({
        json: editor.getJSON(),
        html: editor.getHTML(),
        text: editor.getText()
      })
    },
    editorProps: {
      attributes: {
        class: 'adgravity-editor focus:outline-none min-h-[500px] p-8 text-lg leading-relaxed',
      },
    },
  })

  if (!editor) {
    return null
  }

  return (
    <div className="smart-editor-container glass-panel" style={{ background: 'rgba(20,20,20,0.6)', border: '1px solid var(--panel-border)', borderRadius: '16px', overflow: 'hidden' }}>
      {/* Editor Toolbar (Placeholder for now) */}
      <div className="editor-toolbar" style={{ padding: '12px 16px', borderBottom: '1px solid var(--panel-border)', display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.2)' }}>
        <button onClick={() => editor.chain().focus().toggleBold().run()} className={`toolbar-btn ${editor.isActive('bold') ? 'active' : ''}`}>B</button>
        <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`toolbar-btn ${editor.isActive('italic') ? 'active' : ''}`}>I</button>
        <div style={{ width: '1px', background: 'var(--panel-border)', margin: '0 8px' }}></div>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`toolbar-btn ${editor.isActive('heading', { level: 2 }) ? 'active' : ''}`}>H2</button>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={`toolbar-btn ${editor.isActive('heading', { level: 3 }) ? 'active' : ''}`}>H3</button>
        <div style={{ flex: 1 }}></div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
          {editor.storage.characterCount.words()} words
        </div>
      </div>
      
      {/* TipTap Core Content Area */}
      <EditorContent editor={editor} />
    </div>
  )
}

export default SmartEditor
