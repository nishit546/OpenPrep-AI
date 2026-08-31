/**
 * @fileoverview Full-featured code editor with Monaco syntax highlighting and language selector.
 * Issue #2200: swapped from textarea to @monaco-editor/react.
 */
import React from 'react';
import Editor from '@monaco-editor/react';

const languages = [
    { value: 'python',     label: 'Python 3',          monacoLang: 'python'     },
    { value: 'javascript', label: 'JavaScript (Node.js)', monacoLang: 'javascript' },
    { value: 'cpp',        label: 'C++',                monacoLang: 'cpp'        },
    { value: 'java',       label: 'Java',               monacoLang: 'java'       },
];

const LANG_TO_MONACO = Object.fromEntries(languages.map((l) => [l.value, l.monacoLang]));

const CodeEditorPane = ({ code, setCode, language, setLanguage }) => {
    return (
        <div className="flex flex-col h-full bg-gray-900 rounded-t-xl overflow-hidden border border-gray-700">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
                <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    <select
                        id="code-editor-language-selector"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="bg-gray-700 text-gray-200 text-sm rounded px-2 py-1 outline-none border border-gray-600 focus:border-blue-500"
                    >
                        {languages.map((lang) => (
                            <option key={lang.value} value={lang.value}>{lang.label}</option>
                        ))}
                    </select>
                </div>
                <span className="text-xs text-gray-500">
                    Main.{language === 'python' ? 'py' : language === 'java' ? 'java' : language === 'cpp' ? 'cpp' : 'js'}
                </span>
            </div>
            <div className="flex-1 min-h-0">
                <Editor
                    height="100%"
                    language={LANG_TO_MONACO[language] || 'plaintext'}
                    value={code}
                    onChange={(val) => setCode(val || '')}
                    theme="vs-dark"
                    options={{
                        fontSize: 13,
                        minimap: { enabled: false },
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        tabSize: 4,
                        wordWrap: 'on',
                        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                    }}
                />
            </div>
        </div>
    );
};

export default CodeEditorPane;
