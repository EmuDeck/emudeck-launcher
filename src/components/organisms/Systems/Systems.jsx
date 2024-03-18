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
import System from 'components/molecules/System/System';
import { useFocusable, init, FocusContext, setKeyMap } from 'spatial';

init({
  debug: false,
  visualDebug: false,
});
function Systems({ focusKey: focusKeyParam, systems }) {
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
      console.log({ scrollingRef });
      scrollingRef.current.scrollTo({
        left: x,
        top: y,
        behavior: 'smooth',
      });
    },
    [scrollingRef],
  );

  const multifunction = (item) => {
    onAssetFocus();
  };

  const setSystem = (system) => {
    console.log({ system });
  };
  const { ref, focusSelf, hasFocusedChild, focusKey } = useFocusable({
    focusable: true,
    saveLastFocusedChild: true,
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
          className={`systems ${
            hasFocusedChild ? 'systems-focused' : 'systems-unfocused'
          }`}
        >
          {!systems && (
            <ProgressBar css="progress--success" infinite max="100" />
          )}

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
  );
}

export default Systems;
