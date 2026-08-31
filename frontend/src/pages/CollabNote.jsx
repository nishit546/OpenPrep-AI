import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { schema } from 'prosemirror-schema-basic';
import { exampleSetup } from 'prosemirror-example-setup';
import { ySyncPlugin, yCursorPlugin, yUndoPlugin, undo, redo } from 'y-prosemirror';
import { ArrowLeft, Users, Save } from 'lucide-react';
import 'prosemirror-example-setup/style/style.css';
import 'prosemirror-view/style/prosemirror.css';

const CollabNote = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const editorRef = useRef(null);
  const [status, setStatus] = useState('connecting');
  const [users, setUsers] = useState(1);
  const viewRef = useRef(null);

  useEffect(() => {
    // 1. Create a Yjs document
    const ydoc = new Y.Doc();

    // 2. Connect to the WebSocket provider
    // In production, this would be your backend URL (e.g., wss://api.yourdomain.com)
    // We assume backend runs on port 5000 or relative path for ws
    const wsUrl = process.env.NODE_ENV === 'production' 
      ? window.location.origin.replace(/^http/, 'ws') 
      : 'ws://localhost:1234'; // Default y-websocket server for local dev

    const provider = new WebsocketProvider(wsUrl, `openprep-note-${id}`, ydoc);

    provider.on('status', event => {
      setStatus(event.status); // 'connected' or 'disconnected'
    });

    provider.awareness.on('change', () => {
      setUsers(provider.awareness.getStates().size);
    });

    // 3. Define the Yjs XmlFragment
    const type = ydoc.getXmlFragment('prosemirror');

    // 4. Create the ProseMirror Editor View
    const editorNode = editorRef.current;
    
    if (editorNode) {
      const state = EditorState.create({
        schema,
        plugins: [
          ySyncPlugin(type),
          yCursorPlugin(provider.awareness),
          yUndoPlugin(),
          ...exampleSetup({ schema })
        ]
      });

      const view = new EditorView(editorNode, {
        state,
      });
      viewRef.current = view;
    }

    // Assign a random color for the user's cursor
    const color = '#' + Math.floor(Math.random() * 16777215).toString(16);
    provider.awareness.setLocalStateField('user', {
      name: 'User ' + Math.floor(Math.random() * 100),
      color: color
    });

    return () => {
      provider.destroy();
      ydoc.destroy();
      if (viewRef.current) {
        viewRef.current.destroy();
      }
    };
  }, [id]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      
      <div className="flex-1 max-w-5xl w-full mx-auto p-4 flex flex-col">
        <div className="flex justify-between items-center mb-6 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-neutral-200 dark:border-slate-700">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">
                Collaborative Note
              </h1>
              <div className="flex items-center gap-2 text-xs">
                <span className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="text-neutral-500 dark:text-neutral-400 capitalize">{status}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary-600 bg-primary-50 dark:bg-primary-900/20 px-3 py-1.5 rounded-lg border border-primary-100 dark:border-primary-900/50">
              <Users className="w-4 h-4" />
              {users} online
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg shadow-sm transition-colors text-sm">
              <Save className="w-4 h-4" />
              Save
            </button>
          </div>
        </div>

        <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-neutral-200 dark:border-slate-700 overflow-hidden flex flex-col">
          {/* Editor Container */}
          <style>{`
            .ProseMirror {
              padding: 2rem;
              min-height: 500px;
              outline: none;
              color: inherit;
            }
            .ProseMirror p {
              margin-bottom: 1rem;
              line-height: 1.6;
            }
            /* Yjs Cursor Styles */
            .ProseMirror ychange {
              background-color: rgba(250, 224, 66, 0.5);
            }
            .ProseMirror-yjs-cursor {
              position: absolute;
              border-left: 2px solid black;
              border-right: 2px solid black;
              margin-left: -2px;
              margin-right: -2px;
              pointer-events: none;
              word-break: normal;
            }
            .ProseMirror-yjs-cursor > div {
              position: absolute;
              top: -1.05em;
              left: -2px;
              font-size: 13px;
              background-color: rgb(250, 229, 215);
              font-family: serif;
              font-style: normal;
              font-weight: normal;
              line-height: normal;
              user-select: none;
              color: white;
              padding-left: 2px;
              padding-right: 2px;
              white-space: nowrap;
            }
          `}</style>
          <div 
            ref={editorRef} 
            className="flex-1 overflow-y-auto text-neutral-800 dark:text-neutral-200 prose dark:prose-invert max-w-none"
          />
        </div>
      </div>
    </div>
  );
};

export default CollabNote;
