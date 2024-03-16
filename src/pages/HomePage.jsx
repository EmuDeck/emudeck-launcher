import React, {
  useCallback,
  useEffect,
  useContext,
  useRef,
  useState,
} from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GlobalContext } from 'context/globalContext';
import ProgressBar from 'components/atoms/ProgressBar/ProgressBar';
import Systems from 'components/organisms/Systems/Systems';
import { useFocusable, init, FocusContext, setKeyMap } from 'spatial';

init({
  debug: false,
  visualDebug: false,
});

// setKeyMap({
//   left: 37, // or 'ArrowLeft'
//   up: 38, // or 'ArrowUp'
//   right: 39, // or 'ArrowRight'
//   down: 40, // or 'ArrowDown'
//   enter: 13, // or 'Enter'
// });

function HomePage({ focusKey: focusKeyParam }) {
  const ipcChannel = window.electron.ipcRenderer;
  const navigate = useNavigate();
  const [statePage, setStatePage] = useState({ systems: null });
  const { systems } = statePage;
  const { stateTheme, setStateTheme, stateGamePad, setStateGamePad } =
    useContext(GlobalContext);
  const { gamepad } = stateGamePad;
  const { theme } = stateTheme;
  useEffect(() => {
    if (!gamepad && 'getGamepads' in navigator) {
      console.log('pad detected');
      setStateGamePad({ gamepad: true });
      // Almacena el estado anterior de los botones
      let previousButtonState = {};

      // Mapeo de botones del D-pad a las teclas de flecha
      const dpadKeyMap = {
        button12: 'ArrowUp',
        button13: 'ArrowDown',
        button14: 'ArrowLeft',
        button15: 'ArrowRight',
        button0: 'Enter',
        button2: 'S',
        button3: 'E',
      };

      // Mapeo de códigos de tecla para las teclas de flecha
      const arrowKeyCodes = {
        ArrowUp: 38,
        ArrowDown: 40,
        ArrowLeft: 37,
        ArrowRight: 39,
        Enter: 13,
        Esc: 27,
        S: 83,
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

                  if (buttonIndex === 'button2') {
                    localStorage.removeItem('systems');
                    setTimeout(() => {
                      window.location.reload();
                    }, '500');
                  }

                  console.log(`Botón ${buttonIndex} presionado`);
                  // Simula la pulsación de la tecla de flecha correspondiente
                  if (document.hasFocus()) {
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

    const cache = localStorage.getItem('systems');

    if (cache) {
      console.log('restore from cache');
      const json = JSON.parse(cache);
      const systemsArray = Object.values(json);
      setStatePage({ ...statePage, systems: systemsArray });
      console.log('Cache restored');
    } else {
      ipcChannel.sendMessage('get-systems');
      ipcChannel.once('get-systems', (systemsTemp) => {
        const json = JSON.parse(systemsTemp);
        const systemsArray = Object.values(json);
        localStorage.setItem('systems', systemsTemp);
        setStatePage({ ...statePage, systems: systemsArray });
      });
    }
  }, []);

  const onClickTheme = (value) => {
    ipcChannel.sendMessage('get-theme', [value]);
    ipcChannel.once('get-theme', (theme) => {
      setStateTheme({ ...stateTheme, theme });
    });
  };

  return (
    <>
      <ul className="controls">
        <li>
          <span>A</span> Enter
        </li>
        <li>
          <span>B</span> Exit
        </li>
        <li>
          <span>X</span> Refresh
        </li>
        <li>
          <span>Y</span> Theme Selector
        </li>
      </ul>

      <div className="themes">
        <button type="button" onClick={() => onClickTheme('enabled')}>
          Theme 1
        </button>
        <button type="button" onClick={() => onClickTheme('test')}>
          Theme 1
        </button>
      </div>
      {theme && systems && <Systems systems={systems} />}
    </>
  );
}

export default HomePage;
