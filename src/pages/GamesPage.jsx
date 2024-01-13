import React, { useEffect, useState, useContext, useRef } from 'react';

import { useParams } from 'react-router-dom';

function GamesPage() {
  const ipcChannel = window.electron.ipcRenderer;
  const [statePage, setStatePage] = useState({ games: null, themeCSS: null });
  const { themeCSS, games } = statePage;

  const { system } = useParams();

  useEffect(() => {
    ipcChannel.sendMessage('get-theme');
    ipcChannel.once('get-theme', (themeCSSData) => {
      setStatePage({ ...statePage, themeCSSData });
    });
  }, []);
  useEffect(() => {
    ipcChannel.sendMessage(`get-games`, system);
    ipcChannel.once('get-games', (gamesTemp) => {
      const json = JSON.parse(gamesTemp);
      const gamesArray = Object.values(json);
      setStatePage({ ...statePage, games: gamesArray });
    });
  }, [themeCSS]);
  return (
    <>
      <style>{themeCSS}</style>
      <div>Games for {system}</div>

      {games &&
        games.map((item, i) => {
          return (
            <div className="games__system" key={item.name}>
              <img className="games__bg" src={item.poster} alt="" />
              <div className="games__excerpt">{item.excerpt}</div>
              <div className="games__name">{item.name}</div>
              <div className="games__description">{item.description}</div>
            </div>
          );
        })}
    </>
  );
}

export default GamesPage;
