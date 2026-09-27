import React, { useState, useEffect } from 'react';
import PensieveBackground from './PensieveBackground';
import Bowl from './components/Bowl';
import MemoryView from './components/MemoryView';

const DEFAULT_MEMORIES = [
  { id: 'm1', title: "The First Sort", text: "A hat placed upon a nervous head..." },
  { id: 'm2', title: "Patronus Charm", text: "Expecto Patronum! A silver stag erupts..." },
  { id: 'm3', title: "The Mirror", text: "Desire reflected in the glass..." },
  { id: 'm4', title: "Flying Lesson", text: "Up! The broomstick snaps into hand..." },
  { id: 'm5', title: "Yule Ball", text: "Music and dancing in the Great Hall..." },
];

function App() {
  const [isInside, setIsInside] = useState(false);
  const [isDiving, setIsDiving] = useState(false); // Controls the transition animation
  const [isAdding, setIsAdding] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftText, setDraftText] = useState('');
  const [memories, setMemories] = useState(() => {
    try {
      const raw = localStorage.getItem('pensieve.memories.v1');
      if (!raw) return DEFAULT_MEMORIES;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : DEFAULT_MEMORIES;
    } catch {
      return DEFAULT_MEMORIES;
    }
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      const isMetaK = (e.metaKey || e.ctrlKey) && (e.key?.toLowerCase?.() === 'k');
      if (isMetaK) {
        // Per request: creating memories happens on the homepage (not inside).
        if (isInside || isDiving) return;
        e.preventDefault();
        setIsAdding(true);
        return;
      }
      if (e.code === 'Space' && !isInside && !isDiving) {
        diveIn();
      }
      if (e.code === 'Escape') {
        setIsAdding(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInside, isDiving]);

  useEffect(() => {
    try {
      localStorage.setItem('pensieve.memories.v1', JSON.stringify(memories));
    } catch {
      // ignore
    }
  }, [memories]);

  const diveIn = () => {
    setIsDiving(true);
    // Wait for the scale animation to finish before showing internal content
    setTimeout(() => {
      setIsInside(true);
    }, 1500);
  };

  const surface = () => {
    setIsInside(false);
    setIsDiving(false);
  };

  const addMemory = ({ title, text }) => {
    const t = (title || '').trim();
    const x = (text || '').trim();
    if (!t && !x) return;
    const id = `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    setMemories((prev) => [{ id, title: t || 'Untitled', text: x }, ...prev]);
  };

  const submitNewMemory = (e) => {
    e.preventDefault();
    addMemory({ title: draftTitle, text: draftText });
    setDraftTitle('');
    setDraftText('');
    setIsAdding(false);
  };

  return (
    <PensieveBackground isDiving={isDiving}>
      {/* ENTRY VIEW: Title and Bowl */}
      <div className={`entry-view ${isDiving ? 'fade-out' : 'fade-in'}`}
        style={{
          display: isInside ? 'none' : 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>

        <h1 className="pensieve-title">PENSIEVE</h1>

        <Bowl onEnter={diveIn} isActive={isDiving} />

        <p style={{
          marginTop: '2rem',
          fontSize: '1rem',
          opacity: 0.6,
          fontStyle: 'italic',
          letterSpacing: '1px'
        }}>
          Press SPACE to examine your thoughts · Press Cmd/Ctrl + K to add a memory
        </p>
      </div>

      {/* HOMEPAGE: Add Memory */}
      {isAdding && !isInside && (
        <div className="memory-popup-backdrop" onClick={() => setIsAdding(false)}>
          <div className="memory-popup" onClick={(e) => e.stopPropagation()}>
            <div className="memory-popup-title">Add a memory</div>
            <form className="memory-form" onSubmit={submitNewMemory}>
              <input
                className="memory-input"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="Title"
                autoFocus
              />
              <textarea
                className="memory-textarea"
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                placeholder="Description"
                rows={5}
              />
              <div className="memory-form-actions">
                <button type="button" className="memory-popup-close" onClick={() => setIsAdding(false)}>Cancel</button>
                <button type="submit" className="memory-popup-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MEMORY VIEW: Only visible after dive */}
      {isInside && (
        <MemoryView onBack={surface} memories={memories} />
      )}

    </PensieveBackground>
  );
}

export default App;
