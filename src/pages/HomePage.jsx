import React, {
  useCallback,
  useEffect,
  useContext,
  useRef,
  useState,
} from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GlobalContext } from 'context/globalContext';
import { useFocusable, init, FocusContext, setKeyMap } from '../spatial';

init({
  debug: false,
  visualDebug: false,
});

setKeyMap({
  left: 37, // or 'ArrowLeft'
  up: 38, // or 'ArrowUp'
  right: 39, // or 'ArrowRight'
  down: 40, // or 'ArrowDown'
  enter: 13, // or 'Enter'
});

function System({ data, onEnterPress, onFocus }) {
  const { ref, focused } = useFocusable({
    onEnterPress,
    onFocus,
  });

  const item = data;
  return (
    <div ref={ref}>
      <Link
        focused={focused}
        to={`games/${item.id}`}
        className={`systems__system ${
          focused ? 'systems__system--focused' : ''
        }`}
      >
        <img className="systems__bg" src={item.poster} alt="" />
        <div className="systems__excerpt">{item.excerpt}</div>
        <div className="systems__name">{item.name}</div>
        <div className="systems__count">Games: {item.games}</div>
        <div className="systems__description">{item.description}</div>
        <img className="systems__controller" src={item.controller} alt="" />
      </Link>
    </div>
  );
}

function HomePage({ focusKey: focusKeyParam }) {
  const ipcChannel = window.electron.ipcRenderer;
  const navigate = useNavigate();
  const [statePage, setStatePage] = useState({ systems: null, themeCSS: null });
  const { systems, themeCSS } = statePage;
  const { state, setState } = useContext(GlobalContext);
  const { gamepad } = state;
  useEffect(() => {
    console.log('pad?');
    ipcChannel.sendMessage('get-theme');
    ipcChannel.once('get-theme', (themeCSS) => {
      setStatePage({ ...statePage, themeCSS });
    });
    if (!gamepad && 'getGamepads' in navigator) {
      console.log('pad detected');
      setState({ gamepad: true });
      // Almacena el estado anterior de los botones
      let previousButtonState = {};

      // Mapeo de botones del D-pad a las teclas de flecha
      const dpadKeyMap = {
        button12: 'ArrowUp',
        button13: 'ArrowDown',
        button14: 'ArrowLeft',
        button15: 'ArrowRight',
        button0: 'Enter',
        button1: 'Esc',
      };

      // Mapeo de códigos de tecla para las teclas de flecha
      const arrowKeyCodes = {
        ArrowUp: 38,
        ArrowDown: 40,
        ArrowLeft: 37,
        ArrowRight: 39,
        Enter: 13,
        Esc: 27,
      };

      // Función para manejar la detección de botones
      function handleGamepad() {
        const gamepads = navigator.getGamepads();

        for (const gamepad of gamepads) {
          if (gamepad) {
            // Obtiene el estado actual de los botones
            const buttonState = {};
            gamepad.buttons.forEach((button, index) => {
              buttonState[`button${index}`] = button.pressed;
            });

            // Comprueba si algún botón del D-pad ha cambiado de estado
            for (const buttonIndex in dpadKeyMap) {
              if (
                buttonState[buttonIndex] !== previousButtonState[buttonIndex]
              ) {
                if (buttonState[buttonIndex]) {
                  if (buttonIndex === 'button1') {
                    navigate(-1);
                  }

                  console.log(`Botón ${buttonIndex} presionado`);
                  // Simula la pulsación de la tecla de flecha correspondiente
                  const arrowKeyEvent = new KeyboardEvent('keydown', {
                    key: dpadKeyMap[buttonIndex],
                    code: dpadKeyMap[buttonIndex],
                    keyCode: arrowKeyCodes[dpadKeyMap[buttonIndex]],
                    which: arrowKeyCodes[dpadKeyMap[buttonIndex]],
                    bubbles: true,
                  });

                  // Despacha el evento de teclado simulado
                  document.dispatchEvent(arrowKeyEvent);
                }
              }
            }

            // Actualiza el estado anterior de los botones
            previousButtonState = buttonState;
          }
        }

        // Solicita el siguiente cuadro de animación
        requestAnimationFrame(handleGamepad);
      }

      // Inicia el bucle de detección de gamepad
      handleGamepad();
    }
  }, []);
  useEffect(() => {
    ipcChannel.sendMessage('get-systems');
    ipcChannel.once('get-systems', (systemsTemp) => {
      const json = JSON.parse(systemsTemp);
      const systemsArray = Object.values(json);
      setStatePage({ ...statePage, systems: systemsArray });
    });
  }, [themeCSS]);

  const scrollingRef = useRef(null);

  const onAssetFocus = useCallback(
    ({ x, y }) => {
      scrollingRef.current.scrollTo({
        left: x,
        top: y,
        behavior: 'smooth',
      });
    },
    [scrollingRef],
  );

  const onAssetPress = useCallback(
    (item) => {
      navigate(`games/${item.id}`);
    },
    [navigate],
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
  }, [systems]);

  return (
    <>
      <style>{themeCSS}</style>
      <FocusContext.Provider value={focusKey}>
        <div ref={ref}>
          <div
            ref={scrollingRef}
            className={`systems ${
              hasFocusedChild ? 'systems-focused' : 'systems-unfocused'
            }`}
          >
            {systems &&
              systems.map((item, i) => {
                return (
                  <System
                    data={item}
                    key={item.name}
                    onFocus={onAssetFocus}
                    onEnterPress={() => onAssetPress(item)}
                  />
                );
              })}
          </div>
        </div>
      </FocusContext.Provider>
    </>
  );
}

export default HomePage;
