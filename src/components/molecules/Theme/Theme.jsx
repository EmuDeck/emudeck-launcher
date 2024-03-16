import React, { useEffect, useState } from 'react';
import { PropTypes } from 'prop-types';
import { useFocusable, init, FocusContext, setKeyMap } from 'spatial';
import { useNavigate, Link } from 'react-router-dom';

function Theme({ data, onEnterPress, onFocus }) {
  const { ref, focused } = useFocusable({
    onEnterPress,
    onFocus,
  });

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
          src="file:///Users/rsedano/emudeck/launcher/themes/test/screenshot.png"
          alt="alt"
          width="200"
        />
      </button>
    </div>
  );
}

export default Theme;
