import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useFocusable, init, FocusContext } from '../spatial';

init({
  debug: false,
  visualDebug: false,
});

function MenuItem({ data, tabindex }) {
  const { ref, focused } = useFocusable();

  // return (
  //   <span
  //     ref={ref}
  //     className={`menu-item ${focused ? 'menu-item-focused' : ''}`}
  //   />
  // );
  const item = data;
  return (
    <Link
      tabindex={tabindex}
      ref={ref}
      to={`games/${item.id}`}
      className={`systems__system ${focused ? 'systems__system--focused' : ''}`}
    >
      <img className="systems__bg" src={item.poster} alt="" />
      <div className="systems__excerpt">{item.excerpt}</div>
      <div className="systems__name">{item.name}</div>
      <div className="systems__count">Games: {item.games}</div>
      <div className="systems__description">{item.description}</div>
      <img className="systems__controller" src={item.controller} alt="" />
    </Link>
  );
}

function HomePage({ focusKey: focusKeyParam }) {
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

  const styles = {
    '.container': {
      background: 'lightblue',
      padding: '20px',
    },
    h1: {
      color: 'darkblue',
    },
  };

  const mediaQueries = {
    '(max-width: 600px)': {
      '.container': {
        background: 'lightpink',
      },
    },
    '(min-width: 601px) and (max-width: 900px)': {
      '.container': {
        background: 'lightgreen',
      },
    },
    '(min-width: 901px)': {
      '.container': {
        background: 'lightcoral',
      },
    },
  };

  const { ref, focusSelf, hasFocusedChild, focusKey } = useFocusable({
    focusable: true,
    saveLastFocusedChild: false,
    trackChildren: true,
    autoRestoreFocus: true,
    isFocusBoundary: false,
    focusKey: focusKeyParam,
    preferredChildFocusKey: null,
    onEnterPress: () => {
      alert('ppe');
    },
    onEnterRelease: () => {},
    onArrowPress: () => true,
    onFocus: () => {},
    onBlur: () => {},
    extraProps: { foo: 'bar' },
  });

  useEffect(() => {
    focusSelf();
  }, [systems]);

  return (
    <FocusContext.Provider value={focusKey}>
      <style>{themeCSS}</style>
      <div
        ref={ref}
        className={`systems ${
          hasFocusedChild ? 'systems-focused' : 'systems-unfocused'
        }`}
      >
        {systems &&
          systems.map((item, i) => {
            return <MenuItem tabindex={i} data={item} key={i} />;
          })}
        {systems &&
          systems.map((item, i) => {
            return <MenuItem data={item} key={i} />;
          })}
      </div>
    </FocusContext.Provider>
  );
}

export default HomePage;
