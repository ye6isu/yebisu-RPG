import { useCallback, useEffect, useRef, useState } from 'react';
import './OverlayScrollArea.css';

const MIN_THUMB_SIZE = 24;

export default function OverlayScrollArea({
  children,
  className = '',
  style,
  contentClassName = '',
  contentStyle,
  vertical = true,
  horizontal = true,
}) {
  const viewportRef = useRef(null);
  const contentRef = useRef(null);
  const dragRef = useRef(null);
  const [metrics, setMetrics] = useState({
    verticalVisible: false,
    verticalTop: 0,
    verticalHeight: 0,
    horizontalVisible: false,
    horizontalLeft: 0,
    horizontalWidth: 0,
  });

  const updateMetrics = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const verticalMax = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
    const horizontalMax = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    const verticalHeight = verticalMax > 0
      ? Math.max(MIN_THUMB_SIZE, (viewport.clientHeight / viewport.scrollHeight) * viewport.clientHeight)
      : viewport.clientHeight;
    const horizontalWidth = horizontalMax > 0
      ? Math.max(MIN_THUMB_SIZE, (viewport.clientWidth / viewport.scrollWidth) * viewport.clientWidth)
      : viewport.clientWidth;

    setMetrics({
      verticalVisible: vertical && verticalMax > 0,
      verticalTop: verticalMax > 0
        ? (viewport.scrollTop / verticalMax) * Math.max(0, viewport.clientHeight - verticalHeight)
        : 0,
      verticalHeight,
      horizontalVisible: horizontal && horizontalMax > 0,
      horizontalLeft: horizontalMax > 0
        ? (viewport.scrollLeft / horizontalMax) * Math.max(0, viewport.clientWidth - horizontalWidth)
        : 0,
      horizontalWidth,
    });
  }, [horizontal, vertical]);

  useEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return undefined;

    const observer = new ResizeObserver(updateMetrics);
    observer.observe(viewport);
    observer.observe(content);
    viewport.addEventListener('scroll', updateMetrics);
    updateMetrics();
    return () => {
      observer.disconnect();
      viewport.removeEventListener('scroll', updateMetrics);
    };
  }, [updateMetrics]);

  const startThumbDrag = (axis, event) => {
    if (event.button !== 0) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      axis,
      pointerId: event.pointerId,
      startCoordinate: axis === 'vertical' ? event.clientY : event.clientX,
      startScroll: axis === 'vertical' ? viewport.scrollTop : viewport.scrollLeft,
    };
  };

  const moveThumbDrag = event => {
    const drag = dragRef.current;
    const viewport = viewportRef.current;
    if (!drag || !viewport || drag.pointerId !== event.pointerId) return;

    if (drag.axis === 'vertical') {
      const maxScroll = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
      const thumbTravel = Math.max(1, viewport.clientHeight - metrics.verticalHeight);
      viewport.scrollTop = drag.startScroll + (((event.clientY - drag.startCoordinate) / thumbTravel) * maxScroll);
    } else {
      const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
      const thumbTravel = Math.max(1, viewport.clientWidth - metrics.horizontalWidth);
      viewport.scrollLeft = drag.startScroll + (((event.clientX - drag.startCoordinate) / thumbTravel) * maxScroll);
    }
  };

  const stopThumbDrag = event => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
  };

  return (
    <div className={`ycs-overlay-scroll-area ${className}`.trim()} style={style}>
      <div
        ref={viewportRef}
        className="ycs-overlay-scroll-viewport"
        style={{
          overflowX: horizontal ? 'auto' : 'hidden',
          overflowY: vertical ? 'auto' : 'hidden',
        }}
      >
        <div ref={contentRef} className={`ycs-overlay-scroll-content ${contentClassName}`.trim()} style={contentStyle}>
          {children}
        </div>
      </div>

      {metrics.verticalVisible && (
        <div className="ycs-overlay-scrollbar vertical" aria-hidden="true">
          <span
            className="ycs-overlay-scrollbar-thumb"
            style={{ top: metrics.verticalTop, height: metrics.verticalHeight }}
            onPointerDown={event => startThumbDrag('vertical', event)}
            onPointerMove={moveThumbDrag}
            onPointerUp={stopThumbDrag}
            onPointerCancel={stopThumbDrag}
          />
        </div>
      )}

      {metrics.horizontalVisible && (
        <div className="ycs-overlay-scrollbar horizontal" aria-hidden="true">
          <span
            className="ycs-overlay-scrollbar-thumb"
            style={{ left: metrics.horizontalLeft, width: metrics.horizontalWidth }}
            onPointerDown={event => startThumbDrag('horizontal', event)}
            onPointerMove={moveThumbDrag}
            onPointerUp={stopThumbDrag}
            onPointerCancel={stopThumbDrag}
          />
        </div>
      )}
    </div>
  );
}
