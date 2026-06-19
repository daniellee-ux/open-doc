import { useState } from 'react';
import { DocView } from './doc/DocView';
import { Inspector } from './inspector/Inspector';
import sections from '../docs/report';

export default function App() {
  const [inspect, setInspect] = useState(false);

  return (
    <div className={`odc-app${inspect ? ' is-inspecting' : ''}`}>
      <header className="odc-toolbar">
        <span className="brand">
          Opendoc<span className="dot">.</span>
        </span>
        <span className="doc-title">inspector spike · multi-file document</span>
        <span className="spacer" />
        <button
          type="button"
          className={`odc-btn${inspect ? ' odc-btn--active' : ''}`}
          onClick={() => setInspect((v) => !v)}
        >
          {inspect ? 'Inspecting — click any block' : 'Inspect'}
        </button>
      </header>

      <main className="odc-scroll">
        <DocView sections={sections} />
      </main>

      <Inspector active={inspect} />
    </div>
  );
}
