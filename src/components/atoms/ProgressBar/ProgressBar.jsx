import React, { useEffect, useState } from 'react';
import { PropTypes } from 'prop-types';
const ProgressBar = ({ css, value, max, infinite }) => {
  let valueFinal;
  if (infinite) {
    const [counter, setCounter] = useState(0);
    useEffect(() => {
      const interval = setInterval(() => {
        setCounter((prevCounter) => {
          if (prevCounter === 110) {
            prevCounter = -10;
          }
          return prevCounter + 1;
        });
      }, 100);

      return () => clearInterval(interval);
    }, []);
    valueFinal = counter;
  } else {
    valueFinal = value;
  }

  const percentage = (value * 100) / max;
  return (
    <progress className={`progress ${css}`} value={valueFinal} max={max}>
      <div className="progress">
        <span style={{ width: percentage + '%' }}>{value}%</span>
      </div>
    </progress>
  );
};

ProgressBar.propTypes = {
  css: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  max: PropTypes.string.isRequired,
};

export default ProgressBar;
