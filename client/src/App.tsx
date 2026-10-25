import React, { useState } from 'react';
import './App.css';
import { Header } from './components/Header';
import { ReleaseList } from './components/ReleaseList';
import { ReleaseDetail } from './components/ReleaseDetail';

type ViewState =
  | { type: 'list' }
  | { type: 'create' }
  | { type: 'detail'; releaseId: string };

export const App: React.FC = () => {
  const [viewState, setViewState] = useState<ViewState>({ type: 'list' });

  return (
    <div className="app-wrapper">
      <div className="app-container">
        <Header />

        <main id="app-main-content">
          {viewState.type === 'list' && (
            <ReleaseList
              onSelectRelease={(id) =>
                setViewState({ type: 'detail', releaseId: id })
              }
              onCreateNew={() => setViewState({ type: 'create' })}
            />
          )}

          {viewState.type === 'create' && (
            <ReleaseDetail onBack={() => setViewState({ type: 'list' })} />
          )}

          {viewState.type === 'detail' && (
            <ReleaseDetail
              releaseId={viewState.releaseId}
              onBack={() => setViewState({ type: 'list' })}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
