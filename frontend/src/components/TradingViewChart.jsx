import React, { useEffect, useRef, memo } from 'react';

function TradingViewChart({ symbol }) {
  const container = useRef();

  useEffect(() => {
    // Clear previous content
    if (container.current) {
      container.current.innerHTML = '';
    }

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      "autosize": true,
      "symbol": `PSX:${symbol}`,
      "interval": "D",
      "timezone": "Etc/UTC",
      "theme": "light",
      "style": "3",
      "locale": "en",
      "enable_publishing": false,
      "allow_symbol_change": false,
      "calendar": false,
      "support_host": "https://www.tradingview.com"
    });

    const widgetDiv = document.createElement('div');
    widgetDiv.className = "tradingview-widget-container__widget";
    widgetDiv.style.height = "100%";
    widgetDiv.style.width = "100%";

    container.current.appendChild(widgetDiv);
    container.current.appendChild(script);
  }, [symbol]);

  return (
    <div className="tradingview-widget-container h-[650px] w-full rounded-xl overflow-hidden border border-gray-100 dark:border-neutral-800" ref={container}>
    </div>
  );
}

export default memo(TradingViewChart);
