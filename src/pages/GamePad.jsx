import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';

function GamePad() {
  const navigate = useNavigate();
  useEffect(() => {
    if ('getGamepads' in navigator) {
      console.log('pad detected');
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
        console.log('listening...');
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
  return <div />;
}

export default GamePad;
