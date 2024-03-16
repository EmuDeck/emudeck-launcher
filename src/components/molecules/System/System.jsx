import React, { useEffect, useState } from 'react';
import { PropTypes } from 'prop-types';
import { useFocusable, init, FocusContext, setKeyMap } from 'spatial';
import { useNavigate, Link } from 'react-router-dom';

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
        <img
          loading="lazy"
          className="systems__controller"
          src={item.controller}
          alt=""
        />
        <img loading="lazy" className="systems__logo" src={item.logo} alt="" />
      </Link>
    </div>
  );
}

export default System;
