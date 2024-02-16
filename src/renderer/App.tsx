import React, {
  useCallback,
  useEffect,
  useContext,
  useRef,
  useState,
} from 'react';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from 'pages/HomePage';
import GamesPage from 'pages/GamesPage';
import { GlobalContext } from 'context/globalContext';

export default function App() {
  const [state, setState] = useState({
    gamepad: false,
  });

  const [stateTheme, setStateTheme] = useState({
    theme: null,
  });
  const { theme } = stateTheme;

  const ipcChannel = window.electron.ipcRenderer;
  ipcChannel.sendMessage('get-theme');
  ipcChannel.once('get-theme', (theme) => {
    setStateTheme({ ...stateTheme, theme });
  });

  return (
    <GlobalContext.Provider
      value={{
        state,
        setState,
        stateTheme,
        setStateTheme,
      }}
    >
      <style>{theme}</style>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/games" element={<GamesPage />}>
            <Route path=":system" element={<GamesPage />} />
            <Route path="" element={<GamesPage />} />
          </Route>
        </Routes>
      </Router>
    </GlobalContext.Provider>
  );
}
