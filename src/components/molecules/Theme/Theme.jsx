import React, { useEffect, useState, useContext } from 'react';
import { PropTypes } from 'prop-types';
import { useFocusable, init, FocusContext, setKeyMap } from 'spatial';
import { useNavigate, Link } from 'react-router-dom';
import { GlobalContext } from 'context/globalContext';

function Theme({ data, onEnterPress, onFocus, name }) {
  const { ref, focused } = useFocusable({
    onEnterPress,
    onFocus,
  });

  const { state } = useContext(GlobalContext);

  const { userfolder } = state;

  const item = data;
  return (
    <div ref={ref}>
      <button
        focused={focused}
        className={`themes__preview ${
          focused ? 'themes__preview--focused' : ''
        }`}
        type="button"
      >
        <img
          src={`file://${userfolder}/emudeck/launcher/themes/${name}/screenshot.png`}
          alt={name}
          width="200"
        />
      </button>
    </div>
  );
}

export default Theme;
