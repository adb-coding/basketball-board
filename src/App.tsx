import { useState } from 'react';
import type { CourtType, Play } from './models/types';
import { createPlay } from './models/play';
import { savePlay } from './storage/db';
import { useEditorStore } from './store/editorStore';
import { useLibraryStore } from './store/libraryStore';
import { LibraryPage } from './components/LibraryPage';
import { EditorPage } from './components/EditorPage';

export default function App() {
  const [route, setRoute] = useState<'library' | 'editor'>('library');

  const openPlay = (play: Play) => {
    useEditorStore.getState().loadPlay(play);
    setRoute('editor');
  };

  const newPlay = async (courtType: CourtType, teamId?: string) => {
    const play = createPlay(courtType, 'Untitled play', teamId);
    await savePlay(play);
    openPlay(play);
  };

  const backToLibrary = () => {
    useEditorStore.getState().closePlay();
    setRoute('library');
    // small delay so the closing save lands before the list refresh
    setTimeout(() => void useLibraryStore.getState().refresh(), 100);
  };

  return route === 'library' ? (
    <LibraryPage onOpen={openPlay} onNew={(t, teamId) => void newPlay(t, teamId)} />
  ) : (
    <EditorPage onBack={backToLibrary} />
  );
}
