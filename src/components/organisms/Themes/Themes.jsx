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
import Theme from 'components/molecules/Theme/Theme';
import { useFocusable, init, FocusContext, setKeyMap } from 'spatial';

init({
  debug: false,
  visualDebug: false,
});
function Themes({ focusKey: focusKeyParam, systems }) {
  const navigate = useNavigate();
  useEffect(() => {
    if (systems) {
      console.log('focus');

      setTimeout(() => {
        focusSelf();
      }, '100');
    }
  }, [systems]);

  const scrollingRef = useRef(null);

  const onAssetPress = useCallback(
    (item) => {
      navigate(`games/${item.id}`);
    },
    [navigate],
  );

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
  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref}>
        <div
          ref={scrollingRef}
          className={`themes ${
            hasFocusedChild ? 'themes--focused' : 'themes--unfocused'
          }`}
        >
          {!systems && (
            <ProgressBar css="progress--success" infinite max="100" />
          )}

          <Theme onFocus={onAssetFocus} />
          <Theme onFocus={onAssetFocus} />
          <Theme onFocus={onAssetFocus} />
        </div>
      </div>
    </FocusContext.Provider>
  );
}

export default Themes;
