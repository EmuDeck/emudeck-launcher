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
    console.log({ games });
  }, [games]);

  useEffect(() => {
    ipcChannel.sendMessage(`get-games`, system);
    ipcChannel.once('get-games', (gamesTemp) => {
      const json = JSON.parse(gamesTemp);
      const gamesArray = Object.values(json);
      setStatePage({ ...statePage, games: gamesArray });
    });
  }, []);
  return (
    <>
      <style>{themeCSS}</style>
      <div>Games for {system}</div>

      {games != null &&
        games.map((item) => {
          return (
            <div className="games__system" key={item.name}>
              <img
                className="games__bg"
                src={`https://images.launchbox-app.com/${item.FileName}`}
                alt=""
              />
              <div className="games__name">{item.name}</div>
              <div className="games__description">{item.description}</div>
            </div>
          );
        })}
    </>
  );
}

export default GamesPage;
