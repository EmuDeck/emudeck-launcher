import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';

import HomePage from 'pages/HomePage';
import GamesPage from 'pages/GamesPage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/games" element={<GamesPage />}>
          <Route path=":system" element={<GamesPage />} />
          <Route path="" element={<GamesPage />} />
        </Route>
      </Routes>
    </Router>
  );
}
