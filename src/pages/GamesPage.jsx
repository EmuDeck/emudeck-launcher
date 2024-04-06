import React, {
  useCallback,
  useEffect,
  useState,
  useRef,
  useContext,
} from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { GlobalContext } from 'context/globalContext';
import ProgressBar from 'components/atoms/ProgressBar/ProgressBar';
import { useFocusable, init, FocusContext } from '../spatial';

init({
  debug: true,
  visualDebug: false,
});

function Game({ data, onEnterPress, onFocus }) {
  const { ref, focused } = useFocusable({
    onEnterPress,
    onFocus,
  });

  const item = data;
  let { name } = item;
  const maxLength = 24;
  const ogName = name;
  name = name.slice(0, maxLength);
  const isTextCut = ogName.length > maxLength;
  return (
    <Link
      ref={ref}
      href="/"
      focused={focused}
      className={`games__system ${focused ? 'games__system--focused' : ''}`}
    >
      {!item.logo && (
        <div className="games__name">
          {name}
          {isTextCut && '...'}
        </div>
      )}
      {item.box && (
        <img loading="lazy" className="games__bg" src={`${item.box}`} alt="" />
      )}
      {item.screenshot && (
        <picture>
          <img
            loading="lazy"
            className="games__bg games__screenshot"
            src={`${item.screenshot}`}
            alt=""
          />
        </picture>
      )}
      {item.logo && (
        <img
          loading="lazy"
          className="games__bg games__logo"
          src={`${item.logo}`}
          alt=""
        />
      )}
    </Link>
  );
}

function GamesPage({ focusKey: focusKeyParam }) {
  const navigate = useNavigate();
  const ipcChannel = window.electron.ipcRenderer;
  const [statePage, setStatePage] = useState({ games: null });
  const { games } = statePage;
  const { system } = useParams();
  const { state } = useContext(GlobalContext);
  const { userfolder } = state;

  useEffect(() => {
    const cache = localStorage.getItem(system);
    if (cache) {
      console.log('restore from cache');
      const json = JSON.parse(cache);
      const gamesArray = Object.values(json);
      setStatePage({ ...statePage, games: gamesArray });
      console.log('Cache restored');
      // askForArtwork(system, cache);
    } else {
      console.log('ask for games');
      ipcChannel.sendMessage(`get-games`, system);
      ipcChannel.once('get-games', (gamesTemp) => {
        console.log('games received');
        const json = JSON.parse(gamesTemp);
        const gamesArray = Object.values(json);

        localStorage.setItem(system, gamesTemp);
        console.log('games to state');
        setStatePage({ ...statePage, games: gamesArray });
        console.log('games loaded');
        // askForArtwork(system, gamesTemp);
      });
    }
  }, []);

  const askForArtwork = (system, cache) => {
    ipcChannel.sendMessage(`ss-artwork`, system);
    ipcChannel.on('ss-artwork', (gamesTemp) => {
      console.log('updating new artwork');
      const jsonCache = JSON.parse(cache);
      const jsonNew = JSON.parse(gamesTemp);

      console.log({ jsonNew });
      const jsonCacheArray = Object.values(jsonCache);
      const jsonNewArray = Object.values(jsonNew);

      const merged = jsonCacheArray.map((item) => {
        const update = jsonNewArray.find(
          (updateItem) => updateItem.path === item.path,
        );
        if (update) {
          return { ...item, ...update };
        }
        return item;
      });

      localStorage.setItem(system, JSON.stringify(merged));
      // setStatePage({ ...statePage, games: merged });
    });
  };

  const scrollingRef = useRef(null);

  const onAssetFocus = useCallback(
    ({ x, y }) => {
      scrollingRef.current.scrollTo({
        left: x,
        top: y - 100,
        behavior: 'smooth',
      });
    },
    [scrollingRef],
  );

  const { ref, focusSelf, hasFocusedChild, focusKey } = useFocusable({
    focusable: true,
    saveLastFocusedChild: false,
    trackChildren: true,
    autoRestoreFocus: true,
    isFocusBoundary: false,
    focusKey: focusKeyParam,
    preferredChildFocusKey: null,
    onEnterPress: () => {},
    onEnterRelease: () => {},
    onArrowPress: () => true,
    onFocus: () => {},
    onBlur: () => {},
    extraProps: { foo: 'bar' },
  });

  useEffect(() => {
    focusSelf();
  }, [games]);

  const loadGame = (item) => {
    ipcChannel.sendMessage('load-game', [item]);
    ipcChannel.once('load-game', (error, stdout, stderr) => {
      console.log({ error, stdout, stderr });
    });
  };

  return (
    <>
      {!games && (
        <div className="loading">
          <div className="loading__group">
            <span className="loading__title">
              Creating database, please wait...
            </span>
            <br />
            <ProgressBar css="progress--success" infinite max="100" />
          </div>
        </div>
      )}
      {games && (
        <div className="system-title">
          <img
            src={`file:///${userfolder}/emudeck/launcher/themes/default/logos/${system}.svg`}
            alt="alt"
            width="200"
          />
        </div>
      )}
      <FocusContext.Provider value={focusKey}>
        {games && (
          <ul className="controls">
            <li>
              <span>A</span> Play
            </li>
            <li onClick={() => navigate(-1)}>
              <span>B</span> Go back
            </li>
            <li onClick={() => window.location.reload()}>
              <span>X</span> Refresh
            </li>
          </ul>
        )}
        {games && (
          <div ref={ref} className={system}>
            <div
              ref={scrollingRef}
              className={`games ${
                hasFocusedChild ? 'games-focused' : 'games-unfocused'
              }`}
            >
              {games &&
                games.map((item, i) => {
                  return (
                    <Game
                      data={item}
                      key={i}
                      onFocus={onAssetFocus}
                      onEnterPress={() => loadGame(item)}
                    />
                  );
                })}
            </div>
          </div>
        )}
      </FocusContext.Provider>
    </>
  );
}

export default GamesPage;
