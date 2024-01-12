import React, { useEffect } from 'react';

function JsonStyleComponent({ styles, mediaQueries }) {
  useEffect(() => {
    // Crear un elemento style
    const styleElement = document.createElement('style');

    // Convertir el objeto JSON a una cadena de estilos
    const styleString = Object.keys(styles)
      .map((selector) => {
        const rules = styles[selector];
        const ruleString = Object.keys(rules)
          .map((property) => `${property}: ${rules[property]};`)
          .join(' ');
        return `${selector} { ${ruleString} }`;
      })
      .join(' ');

    // Agregar la cadena de estilos al contenido del elemento style
    styleElement.innerHTML = styleString;

    // Agregar media queries
    if (mediaQueries) {
      const mediaQueryStrings = Object.keys(mediaQueries)
        .map((query) => `@media ${query} { ${mediaQueries[query]} }`)
        .join(' ');

      styleElement.innerHTML += mediaQueryStrings;
    }

    // Agregar el elemento style al head del documento
    document.head.appendChild(styleElement);

    // Limpiar el elemento style al desmontar el componente
    return () => {
      document.head.removeChild(styleElement);
    };
  }, [styles, mediaQueries]);

  return null; // Este componente no renderiza nada en el DOM
}

export default JsonStyleComponent;
