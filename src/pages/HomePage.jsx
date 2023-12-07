import React, { useEffect, useState } from 'react';

import { useNavigate, Link } from 'react-router-dom';

function HomePage() {
  const ipcChannel = window.electron.ipcRenderer;
  const [statePage, setStatePage] = useState({ systems: null, themeCSS: null });
  const { systems, themeCSS } = statePage;

  const showGames = (system) => {
    console.log(system);
  };

  useEffect(() => {
    ipcChannel.sendMessage('get-theme');
    ipcChannel.once('get-theme', (themeCSS) => {
      setStatePage({ ...statePage, themeCSS });
    });
  }, []);
  useEffect(() => {
    ipcChannel.sendMessage('get-systems');
    ipcChannel.once('get-systems', (systemsTemp) => {
      const json = JSON.parse(systemsTemp);
      const systemsArray = Object.values(json);
      setStatePage({ ...statePage, systems: systemsArray });
    });
  }, [themeCSS]);
  return (
    <>
      <style>{themeCSS}</style>
      <div className="systems">
        {systems &&
          systems.map((item, i) => {
            return (
              <Link to={`games/${item.id}`} className="systems__system" key={i}>
                <img className="systems__bg" src={item.poster} alt="" />
                <div className="systems__excerpt">{item.excerpt}</div>
                <div className="systems__name">{item.name}</div>
                <div className="systems__count">Games: {item.games}</div>
                <div className="systems__description">{item.description}</div>
                <img
                  className="systems__controller"
                  src={item.controller}
                  alt=""
                />
              </Link>
            );
          })}
      </div>
    </>
  );
}

export default HomePage;
