import React, { useEffect, useState, useContext } from 'react';
import { PropTypes } from 'prop-types';
import { useFocusable, init, FocusContext, setKeyMap } from 'spatial';
import { useNavigate, Link } from 'react-router-dom';
import { GlobalContext } from 'context/globalContext';

function System({ data, onEnterPress, onFocus }) {
  const { ref, focused } = useFocusable({
    onEnterPress,
    onFocus,
  });
  const { state, setState } = useContext(GlobalContext);

  const { themeName, currentSystem, userfolder } = state;
  const item = data;

  const saveSystem = (id) => {
    console.log({ id });
    setState({ ...state, currentSystem: id });
  };

  const devnull = (id) => {
    // setState({ ...state, currentSystem: id });
  };

  useEffect(() => {
    if (focused) {
      if (item.id !== currentSystem) {
        saveSystem(item.id);
      }
    }
    // Opcionalmente, incluir devnull o lógica similar si necesitas manejar la pérdida de foco.
  }, [focused, item.id, saveSystem]);

  return (
    <div ref={ref}>
      <Link
        focused={focused}
        to={`games/${item.id}`}
        className={`systems__system ${
          focused ? 'systems__system--focused' : ''
        }`}
      >
        <img
          className="systems__bg"
          src={`file://${userfolder}/emudeck/launcher/themes/${themeName}/systems/${item.id}.jpg`}
          alt=""
        />
        <div className="systems__excerpt">{item.excerpt}</div>
        <div className="systems__name">{item.name}</div>
        <div className="systems__count">Games: {item.games}</div>
        <div className="systems__description">{item.description}</div>
        <div className="systems__controller-holder">
          <img
            loading="lazy"
            className="systems__controller"
            src={item.controller}
            alt=""
          />
        </div>
        <div className="systems__logo-holder">
          <img
            loading="lazy"
            className="systems__logo"
            src={`file://${userfolder}/emudeck/launcher/themes/${themeName}/logos/${item.id}.svg`}
            alt=""
          />
        </div>
      </Link>
    </div>
  );
}

export default System;
