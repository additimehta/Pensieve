import React from 'react';
import PensieveBackground from './PensieveBackground';
import Bowl from './components/Bowl';

function App() {
  return (
    <PensieveBackground isDiving={false}>
      <div
        className="entry-view fade-in"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        <h1 className="pensieve-title">PENSIEVE</h1>

        <Bowl />

        <p className="pensieve-hint">
          Move across the surface
        </p>
      </div>
    </PensieveBackground>
  );
}

export default App;
