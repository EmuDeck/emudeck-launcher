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
  const [stateGamePad, setStateGamePad] = useState({
    gamepad: false,
  });
  const ipcChannel = window.electron.ipcRenderer;

  const [state, setState] = useState({
    userfolder: undefined,
  });

  const [stateTheme, setStateTheme] = useState({
    theme: null,
  });
  const { theme } = stateTheme;

  useEffect(() => {
    ipcChannel.sendMessage('get-user-directory', []);
    ipcChannel.once(`user-directory`, (message) => {
      setState({ ...state, userfolder: message });
    });
    ipcChannel.sendMessage('get-theme', ['default']);
    ipcChannel.once('get-theme', (theme) => {
      setStateTheme({ ...stateTheme, theme });
    });
  }, []);

  return (
    <GlobalContext.Provider
      value={{
        stateGamePad,
        setStateGamePad,
        stateTheme,
        setStateTheme,
        state,
        setState,
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
