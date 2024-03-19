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
    themeName: 'default',
    themes: undefined,
    currentSystem: undefined,
  });

  const [stateTheme, setStateTheme] = useState({
    theme: null,
  });
  const { themeName } = state;
  const { theme } = stateTheme;

  useEffect(() => {
    ipcChannel.sendMessage('get-user-directory', []);
    ipcChannel.once(`user-directory`, (userFolder) => {
      // setState({ ...state, userfolder: userFolder });

      ipcChannel.sendMessage('get-available-themes');
      ipcChannel.once('get-available-themes', (systemsTemp) => {
        // Set current Selected theme
        const currentTheme = localStorage.getItem('current_theme');
        if (currentTheme) {
          ipcChannel.sendMessage('get-theme', [currentTheme]);
          ipcChannel.once('get-theme', (theme) => {
            setState({
              ...state,
              themeName: currentTheme,
              themes: systemsTemp,
              userfolder: userFolder,
            });
            setStateTheme({ ...stateTheme, theme });
          });
        }
      });
    });
    ipcChannel.sendMessage('get-theme', [themeName]);
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
