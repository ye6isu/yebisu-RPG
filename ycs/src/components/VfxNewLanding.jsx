import { useCallback, useEffect, useRef, useState } from 'react';
import ThreeDViewport from './ThreeDViewport';
import { FieldRow, NumberInput, StringField } from './Field/Field';
import { useTitlebarActions } from './Titlebar/TitlebarActionsContext';
import './VfxNewLanding.css';

const LEFT_WIDTH_KEY = 'ycs-vfx-new-left-width';
const RIGHT_WIDTH_KEY = 'ycs-vfx-new-right-width';
const BOTTOM_HEIGHT_KEY = 'ycs-vfx-new-bottom-height';
const BOTTOM_LEFT_WIDTH_KEY = 'ycs-vfx-new-bottom-left-width';

const MIN_LEFT_WIDTH = 180;
const MIN_RIGHT_WIDTH = 180;
const MIN_VIEWPORT_WIDTH = 300;
const MIN_BOTTOM_HEIGHT = 180;
const MIN_BOTTOM_LEFT_WIDTH = 180;
const MIN_BOTTOM_CONTENT_WIDTH = 300;
const MIN_MAIN_HEIGHT = 180;
const RESIZER_SIZE = 5;
const PREVIEW_EDGE_BUFFER = 7;
const MIN_RULER_TICK_SPACING = 36;
const TIMELINE_SNAP_DISTANCE = 8;
const TIMELINE_ROW_HEIGHT = 28;

function objectDefaults(overrides = {}) {
  return {
    position: { x: '0', y: '1', z: '0' },
    rotation: { x: '0', y: '0', z: '0' },
    scale: { x: '1', y: '1', z: '1' },
    texture: '',
    opacity: '1',
    billboard: true,
    fullBright: true,
    ...overrides,
  };
}

function VectorFields({ value, onChange }) {
  return (
    <div className="vfx-new-vector-fields">
      {['x', 'y', 'z'].map(axis => (
        <label key={axis}>
          <span>{axis.toUpperCase()}</span>
          <NumberInput value={value?.[axis] ?? '0'} onChange={next => onChange(axis, next)} />
        </label>
      ))}
    </div>
  );
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function storedSize(key, fallback) {
  const parsed = Number.parseInt(localStorage.getItem(key), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bufferedPreviewPosition(value) {
  const clampedValue = clamp(value, 0, 100);
  const edgeCorrection = ((PREVIEW_EDGE_BUFFER * 2) * clampedValue) / 100;
  return `calc(${PREVIEW_EDGE_BUFFER}px + ${clampedValue}% - ${edgeCorrection}px)`;
}

function bufferedPreviewPixelPosition(value, width) {
  const usableWidth = Math.max(1, width - (PREVIEW_EDGE_BUFFER * 2));
  return PREVIEW_EDGE_BUFFER + ((value / 100) * usableWidth);
}

function formatRulerTime(value) {
  return String(Math.round(value));
}

function niceWholeInterval(minimumInterval) {
  if (minimumInterval <= 1) return 1;
  const exponent = Math.floor(Math.log10(minimumInterval));
  const magnitude = 10 ** exponent;
  const normalized = minimumInterval / magnitude;
  if (normalized <= 1) return magnitude;
  if (normalized <= 2) return 2 * magnitude;
  if (normalized <= 5) return 5 * magnitude;
  return 10 * magnitude;
}

function rulerInterval(span, width) {
  const usableWidth = Math.max(1, width - (PREVIEW_EDGE_BUFFER * 2));
  const minimumInterval = (span / usableWidth) * MIN_RULER_TICK_SPACING;
  return niceWholeInterval(minimumInterval);
}

function rulerTicks(start, end, interval) {
  const ticks = [];
  const first = Math.ceil((start - 0.000001) / interval) * interval;
  for (let value = first; value <= end + 0.000001; value += interval) {
    ticks.push(Number(value.toFixed(6)));
  }
  return ticks;
}

function VfxNewLanding({ isActive = false }) {
  const [leftWidth, setLeftWidth] = useState(() => Math.max(MIN_LEFT_WIDTH, storedSize(LEFT_WIDTH_KEY, 230)));
  const [rightWidth, setRightWidth] = useState(() => Math.max(MIN_RIGHT_WIDTH, storedSize(RIGHT_WIDTH_KEY, 310)));
  const [bottomHeight, setBottomHeight] = useState(() => Math.max(MIN_BOTTOM_HEIGHT, storedSize(BOTTOM_HEIGHT_KEY, 180)));
  const [bottomLeftWidth, setBottomLeftWidth] = useState(() => Math.max(MIN_BOTTOM_LEFT_WIDTH, storedSize(BOTTOM_LEFT_WIDTH_KEY, 230)));
  const [durationTicks, setDurationTicks] = useState(100);
  const [previewTick, setPreviewTick] = useState(0);
  const [previewTickInput, setPreviewTickInput] = useState('0');
  const [playing, setPlaying] = useState(false);
  const [timelineView, setTimelineView] = useState({ start: 0, end: 100 });
  const [timelineObjects, setTimelineObjects] = useState([
    objectDefaults({ id: 'dummy-1', name: 'Dummy', type: 'dummy', start: 0, end: 25, expanded: false }),
  ]);
  const [objectSearch, setObjectSearch] = useState('');
  const [selectedObjectId, setSelectedObjectId] = useState('dummy-1');
  const [renamingObject, setRenamingObject] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [previewBarWidth, setPreviewBarWidth] = useState(600);
  const [durationScrollbar, setDurationScrollbar] = useState({ visible: false, left: 0, width: 0 });
  const [objectScrollbar, setObjectScrollbar] = useState({ visible: false, top: 0, height: 0 });
  const [timelineScrollbar, setTimelineScrollbar] = useState({ visible: false, top: 0, height: 0 });
  const [inspectorScrollbar, setInspectorScrollbar] = useState({ visible: false, top: 0, height: 0 });
  const workspaceRef = useRef(null);
  const resizingRef = useRef(null);
  const previewBarRef = useRef(null);
  const previewTickInputFocusedRef = useRef(false);
  const currentTimeDragRef = useRef(null);
  const durationScrollRef = useRef(null);
  const durationThumbDragRef = useRef(null);
  const objectListScrollRef = useRef(null);
  const inspectorScrollRef = useRef(null);
  const verticalThumbDragRef = useRef(null);
  const timelineDragRef = useRef(null);
  const nextPlaneNumberRef = useRef(1);
  const leftTimelineScrollRef = useRef(null);
  const rightTimelineScrollRef = useRef(null);
  const paneSizesRef = useRef({ leftWidth, rightWidth, bottomHeight, bottomLeftWidth });
  paneSizesRef.current = { leftWidth, rightWidth, bottomHeight, bottomLeftWidth };
  const timelineSpan = Math.max(0.0001, timelineView.end - timelineView.start);
  const previewPosition = clamp(((previewTick - timelineView.start) / timelineSpan) * 100, 0, 100);
  const previewRulerInterval = rulerInterval(timelineSpan, previewBarWidth);
  const previewRulerTicks = rulerTicks(timelineView.start, timelineView.end, previewRulerInterval);
  const normalizedObjectSearch = objectSearch.trim().toLowerCase();
  const visibleTimelineObjects = timelineObjects.filter(object => (
    !normalizedObjectSearch || `${object.name ?? ''} ${object.id ?? ''}`.toLowerCase().includes(normalizedObjectSearch)
  ));
  const selectedObject = timelineObjects.find(object => object.id === selectedObjectId) ?? null;
  let timelineContentHeight = 0;
  const timelineObjectLayout = visibleTimelineObjects.map(object => {
    const top = timelineContentHeight;
    timelineContentHeight += TIMELINE_ROW_HEIGHT + (object.expanded ? TIMELINE_ROW_HEIGHT : 0);
    const startPosition = ((object.start - timelineView.start) / timelineSpan) * 100;
    const endPosition = ((object.end - timelineView.start) / timelineSpan) * 100;
    const left = bufferedPreviewPixelPosition(startPosition, previewBarWidth);
    const right = bufferedPreviewPixelPosition(endPosition, previewBarWidth);
    return { ...object, top, left, right };
  });
  const verticalScrollContentKey = visibleTimelineObjects.map(object => `${object.id}:${object.expanded}`).join('|');

  useEffect(() => {
    const bar = previewBarRef.current;
    if (!bar) return undefined;
    const updateWidth = () => setPreviewBarWidth(Math.max(1, bar.clientWidth));
    const observer = new ResizeObserver(updateWidth);
    observer.observe(bar);
    updateWidth();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const registrations = [
      { scroller: objectListScrollRef.current, setScrollbar: setObjectScrollbar },
      { scroller: rightTimelineScrollRef.current, setScrollbar: setTimelineScrollbar },
      { scroller: inspectorScrollRef.current, setScrollbar: setInspectorScrollbar },
    ].filter(registration => registration.scroller);
    const cleanups = registrations.map(({ scroller, setScrollbar }) => {
      const updateScrollbar = () => {
        const viewportHeight = scroller.clientHeight;
        const contentHeight = scroller.scrollHeight;
        const maxScroll = Math.max(0, contentHeight - viewportHeight);
        if (maxScroll <= 0) {
          setScrollbar({ visible: false, top: 0, height: viewportHeight });
          return;
        }
        const thumbHeight = Math.max(24, (viewportHeight / contentHeight) * viewportHeight);
        const thumbTravel = Math.max(0, viewportHeight - thumbHeight);
        setScrollbar({
          visible: true,
          top: (scroller.scrollTop / maxScroll) * thumbTravel,
          height: thumbHeight,
        });
      };
      const observer = new ResizeObserver(updateScrollbar);
      observer.observe(scroller);
      if (scroller.firstElementChild) observer.observe(scroller.firstElementChild);
      scroller.addEventListener('scroll', updateScrollbar);
      updateScrollbar();
      return () => {
        observer.disconnect();
        scroller.removeEventListener('scroll', updateScrollbar);
      };
    });
    return () => cleanups.forEach(cleanup => cleanup());
  }, [verticalScrollContentKey, bottomHeight, leftWidth, selectedObjectId]);

  useEffect(() => {
    const scroller = durationScrollRef.current;
    if (!scroller) return undefined;
    const updateScrollbar = () => {
      const viewportWidth = scroller.clientWidth;
      const contentWidth = scroller.scrollWidth;
      const maxScroll = Math.max(0, contentWidth - viewportWidth);
      if (maxScroll <= 0) {
        setDurationScrollbar({ visible: false, left: 0, width: viewportWidth });
        return;
      }
      const thumbWidth = Math.max(24, (viewportWidth / contentWidth) * viewportWidth);
      const thumbTravel = Math.max(0, viewportWidth - thumbWidth);
      setDurationScrollbar({
        visible: true,
        left: (scroller.scrollLeft / maxScroll) * thumbTravel,
        width: thumbWidth,
      });
    };
    const observer = new ResizeObserver(updateScrollbar);
    observer.observe(scroller);
    if (scroller.firstElementChild) observer.observe(scroller.firstElementChild);
    scroller.addEventListener('scroll', updateScrollbar);
    updateScrollbar();
    return () => {
      observer.disconnect();
      scroller.removeEventListener('scroll', updateScrollbar);
    };
  }, []);

  useEffect(() => {
    if (!previewTickInputFocusedRef.current) setPreviewTickInput(String(previewTick));
  }, [previewTick]);

  useEffect(() => {
    if (!playing) return undefined;
    const interval = window.setInterval(() => {
      setPreviewTick(current => {
        const next = current + 1;
        return next > durationTicks ? 0 : next;
      });
    }, 50);
    return () => window.clearInterval(interval);
  }, [playing, durationTicks]);

  useEffect(() => {
    const togglePlayback = event => {
      if (event.code !== 'Space' || event.repeat || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;
      const target = event.target;
      if (target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"]')) return;
      event.preventDefault();
      setPlaying(current => !current);
    };
    window.addEventListener('keydown', togglePlayback);
    return () => window.removeEventListener('keydown', togglePlayback);
  }, []);

  useEffect(() => {
    const resizeSelectedObjectToPlayhead = event => {
      if ((event.code !== 'BracketLeft' && event.code !== 'BracketRight') || event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
      const target = event.target;
      if (target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"]')) return;
      event.preventDefault();
      setPlaying(false);
      setTimelineObjects(current => current.map(object => {
        if (object.id !== selectedObjectId) return object;
        if (event.code === 'BracketLeft') {
          return { ...object, start: clamp(previewTick, 0, object.end - 1) };
        }
        return { ...object, end: clamp(previewTick, object.start + 1, durationTicks) };
      }));
    };
    window.addEventListener('keydown', resizeSelectedObjectToPlayhead);
    return () => window.removeEventListener('keydown', resizeSelectedObjectToPlayhead);
  }, [previewTick, durationTicks, selectedObjectId]);

  const updateDuration = event => {
    const nextDuration = clamp(Math.round(Number(event.target.value) || 1), 1, 12000);
    setDurationTicks(nextDuration);
    setPreviewTick(current => Math.min(current, nextDuration));
    setTimelineObjects(current => current.map(object => {
      const end = Math.min(object.end, nextDuration);
      const start = Math.min(object.start, Math.max(0, end - 1));
      return { ...object, start, end };
    }));
    setTimelineView({ start: 0, end: nextDuration });
  };

  const addPlane = () => {
    const planeNumber = nextPlaneNumberRef.current;
    nextPlaneNumberRef.current += 1;
    const id = `plane-${planeNumber}`;
    setTimelineObjects(current => [
      ...current,
      objectDefaults({
        id,
        name: `Plane ${planeNumber}`,
        type: 'plane',
        start: 0,
        end: durationTicks,
        expanded: false,
      }),
    ]);
    setSelectedObjectId(id);
  };

  useTitlebarActions({
    active: isActive,
    search: objectSearch,
    onSearchChange: setObjectSearch,
    onAdd: addPlane,
  });

  const deleteObject = (objectId, event) => {
    event.stopPropagation();
    const objectIndex = timelineObjects.findIndex(object => object.id === objectId);
    if (objectIndex < 0) return;
    const remainingObjects = timelineObjects.filter(object => object.id !== objectId);
    setTimelineObjects(remainingObjects);
    if (selectedObjectId === objectId) {
      const nextSelection = remainingObjects[Math.min(objectIndex, remainingObjects.length - 1)];
      setSelectedObjectId(nextSelection?.id ?? null);
    }
  };

  const toggleObjectExpanded = objectId => {
    setTimelineObjects(current => current.map(object => (
      object.id === objectId ? { ...object, expanded: !object.expanded } : object
    )));
  };

  const updateObject = (objectId, patch) => {
    setTimelineObjects(current => current.map(object => (
      object.id === objectId ? { ...object, ...patch } : object
    )));
  };

  const updateObjectVector = (objectId, field, axis, value) => {
    setTimelineObjects(current => current.map(object => (
      object.id === objectId
        ? { ...object, [field]: { ...object[field], [axis]: value } }
        : object
    )));
  };

  const beginObjectRename = (object, source, event) => {
    event.stopPropagation();
    setSelectedObjectId(object.id);
    setRenameValue(object.name);
    setRenamingObject({ id: object.id, source });
  };

  const commitObjectRename = () => {
    if (!renamingObject) return;
    const nextName = renameValue.trim();
    if (nextName) updateObject(renamingObject.id, { name: nextName });
    setRenamingObject(null);
  };

  const commitPreviewTick = rawValue => {
    const parsed = Number(rawValue);
    const nextTick = clamp(
      Math.round(Number.isFinite(parsed) ? parsed : previewTick),
      0,
      durationTicks,
    );
    setPlaying(false);
    setPreviewTick(nextTick);
    setPreviewTickInput(String(nextTick));
  };

  const startCurrentTimeDrag = event => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    currentTimeDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startTick: previewTick,
      dragging: false,
    };
  };

  const moveCurrentTimeDrag = event => {
    const drag = currentTimeDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    if (!drag.dragging && Math.abs(deltaX) < 3) return;
    drag.dragging = true;
    event.preventDefault();
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    const nextTick = clamp(drag.startTick + Math.round(deltaX / 6), 0, durationTicks);
    setPlaying(false);
    setPreviewTick(nextTick);
    setPreviewTickInput(String(nextTick));
  };

  const stopCurrentTimeDrag = event => {
    const drag = currentTimeDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    currentTimeDragRef.current = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  const handleDurationWheel = event => {
    const scroller = durationScrollRef.current;
    if (!scroller || scroller.scrollWidth <= scroller.clientWidth) return;
    event.preventDefault();
    scroller.scrollLeft += event.deltaX || event.deltaY;
  };

  const startDurationThumbDrag = event => {
    const scroller = durationScrollRef.current;
    if (!scroller || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    durationThumbDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: scroller.scrollLeft,
    };
  };

  const moveDurationThumbDrag = event => {
    const drag = durationThumbDragRef.current;
    const scroller = durationScrollRef.current;
    if (!drag || !scroller || drag.pointerId !== event.pointerId) return;
    const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    const thumbTravel = Math.max(1, scroller.clientWidth - durationScrollbar.width);
    scroller.scrollLeft = clamp(
      drag.startScrollLeft + (((event.clientX - drag.startX) / thumbTravel) * maxScroll),
      0,
      maxScroll,
    );
  };

  const stopDurationThumbDrag = event => {
    const drag = durationThumbDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    durationThumbDragRef.current = null;
  };

  const startVerticalThumbDrag = (source, event) => {
    const scroller = source === 'objects'
      ? objectListScrollRef.current
      : source === 'inspector'
        ? inspectorScrollRef.current
        : rightTimelineScrollRef.current;
    if (!scroller || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    verticalThumbDragRef.current = {
      pointerId: event.pointerId,
      source,
      startY: event.clientY,
      startScrollTop: scroller.scrollTop,
    };
  };

  const moveVerticalThumbDrag = event => {
    const drag = verticalThumbDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const scroller = drag.source === 'objects'
      ? objectListScrollRef.current
      : drag.source === 'inspector'
        ? inspectorScrollRef.current
        : rightTimelineScrollRef.current;
    const scrollbar = drag.source === 'objects'
      ? objectScrollbar
      : drag.source === 'inspector'
        ? inspectorScrollbar
        : timelineScrollbar;
    if (!scroller) return;
    const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    const thumbTravel = Math.max(1, scroller.clientHeight - scrollbar.height);
    scroller.scrollTop = clamp(
      drag.startScrollTop + (((event.clientY - drag.startY) / thumbTravel) * maxScroll),
      0,
      maxScroll,
    );
  };

  const stopVerticalThumbDrag = event => {
    const drag = verticalThumbDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    verticalThumbDragRef.current = null;
  };

  const handleTimelineWheel = event => {
    if (!event.ctrlKey && !event.shiftKey) return;
    event.preventDefault();

    const rect = event.currentTarget.getBoundingClientRect();
    const usableWidth = Math.max(1, rect.width - (PREVIEW_EDGE_BUFFER * 2));
    if (event.ctrlKey) {
      const cursorRatio = clamp(
        (event.clientX - rect.left - PREVIEW_EDGE_BUFFER) / usableWidth,
        0,
        1,
      );
      setTimelineView(current => {
        const currentSpan = current.end - current.start;
        const minimumSpan = Math.min(durationTicks, 1);
        const nextSpan = clamp(
          Math.round(currentSpan * Math.exp(event.deltaY * 0.002)),
          minimumSpan,
          durationTicks,
        );
        const cursorTime = current.start + (currentSpan * cursorRatio);
        const nextStart = clamp(
          Math.round(cursorTime - (nextSpan * cursorRatio)),
          0,
          durationTicks - nextSpan,
        );
        return { start: nextStart, end: nextStart + nextSpan };
      });
      return;
    }

    setTimelineView(current => {
      const currentSpan = current.end - current.start;
      const panDelta = (event.deltaX || event.deltaY) * (currentSpan / usableWidth);
      const nextStart = clamp(Math.round(current.start + panDelta), 0, durationTicks - currentSpan);
      return { start: nextStart, end: nextStart + currentSpan };
    });
  };

  const scrubTimelineAt = (clientX, element) => {
    const rect = element.getBoundingClientRect();
    const usableWidth = Math.max(1, rect.width - (PREVIEW_EDGE_BUFFER * 2));
    const position = clamp(
      (clientX - rect.left - PREVIEW_EDGE_BUFFER) / usableWidth,
      0,
      1,
    );
    const nextTick = timelineView.start + (timelineSpan * position);
    setPlaying(false);
    setPreviewTick(clamp(Math.round(nextTick), 0, durationTicks));
  };

  const startTimelineObjectDrag = (objectId, mode, event) => {
    const object = timelineObjects.find(candidate => candidate.id === objectId);
    if (!object) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    timelineDragRef.current = {
      pointerId: event.pointerId,
      objectId,
      mode,
      startX: event.clientX,
      range: { start: object.start, end: object.end },
      moved: false,
      wasSelected: selectedObjectId === objectId,
    };
    setSelectedObjectId(objectId);
    setPlaying(false);
  };

  const moveTimelineObjectDrag = event => {
    const drag = timelineDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (Math.abs(event.clientX - drag.startX) >= 3) drag.moved = true;
    const usableWidth = Math.max(1, previewBarWidth - (PREVIEW_EDGE_BUFFER * 2));
    const deltaTicks = ((event.clientX - drag.startX) / usableWidth) * timelineSpan;
    const snapDistanceTicks = (TIMELINE_SNAP_DISTANCE / usableWidth) * timelineSpan;
    const snap = value => Math.round(value);
    const nearPlayhead = value => event.shiftKey && Math.abs(value - previewTick) <= snapDistanceTicks;
    let nextRange;

    if (drag.mode === 'move') {
      const length = drag.range.end - drag.range.start;
      const candidateStart = drag.range.start + deltaTicks;
      const candidateEnd = candidateStart + length;
      let snappedStart = candidateStart;
      if (nearPlayhead(candidateStart)) {
        snappedStart = previewTick;
      } else if (nearPlayhead(candidateEnd)) {
        snappedStart = previewTick - length;
      }
      const start = clamp(snap(snappedStart), 0, durationTicks - length);
      nextRange = { start, end: snap(start + length) };
    } else if (drag.mode === 'start') {
      const candidateStart = drag.range.start + deltaTicks;
      const start = clamp(
        snap(nearPlayhead(candidateStart) ? previewTick : candidateStart),
        0,
        drag.range.end - 1,
      );
      nextRange = { start, end: drag.range.end };
    } else {
      const candidateEnd = drag.range.end + deltaTicks;
      const end = clamp(
        snap(nearPlayhead(candidateEnd) ? previewTick : candidateEnd),
        drag.range.start + 1,
        durationTicks,
      );
      nextRange = { start: drag.range.start, end };
    }
    setTimelineObjects(current => current.map(object => (
      object.id === drag.objectId ? { ...object, ...nextRange } : object
    )));
  };

  const stopTimelineObjectDrag = event => {
    const drag = timelineDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!drag.moved) setSelectedObjectId(drag.wasSelected ? null : drag.objectId);
    timelineDragRef.current = null;
  };

  const syncTimelineScroll = (source, event) => {
    const other = source === 'left' ? rightTimelineScrollRef.current : leftTimelineScrollRef.current;
    if (other && Math.abs(other.scrollTop - event.currentTarget.scrollTop) > 0.5) {
      other.scrollTop = event.currentTarget.scrollTop;
    }
  };

  const startResize = useCallback((pane, event) => {
    event.preventDefault();
    resizingRef.current = pane;
    document.body.style.cursor = pane === 'bottom' ? 'row-resize' : 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const onMove = event => {
      const pane = resizingRef.current;
      const workspace = workspaceRef.current;
      if (!pane || !workspace) return;

      const rect = workspace.getBoundingClientRect();
      if (pane === 'left') {
        const max = Math.max(
          MIN_LEFT_WIDTH,
          rect.width - paneSizesRef.current.rightWidth - MIN_VIEWPORT_WIDTH - (RESIZER_SIZE * 2),
        );
        setLeftWidth(clamp(event.clientX - rect.left, MIN_LEFT_WIDTH, max));
      } else if (pane === 'right') {
        const max = Math.max(
          MIN_RIGHT_WIDTH,
          rect.width - paneSizesRef.current.leftWidth - MIN_VIEWPORT_WIDTH - (RESIZER_SIZE * 2),
        );
        setRightWidth(clamp(rect.right - event.clientX, MIN_RIGHT_WIDTH, max));
      } else if (pane === 'bottom') {
        const max = Math.max(MIN_BOTTOM_HEIGHT, rect.height - MIN_MAIN_HEIGHT - RESIZER_SIZE);
        setBottomHeight(clamp(rect.bottom - event.clientY, MIN_BOTTOM_HEIGHT, max));
      } else if (pane === 'bottom-left') {
        const max = Math.max(
          MIN_BOTTOM_LEFT_WIDTH,
          rect.width - MIN_BOTTOM_CONTENT_WIDTH - RESIZER_SIZE,
        );
        setBottomLeftWidth(clamp(event.clientX - rect.left, MIN_BOTTOM_LEFT_WIDTH, max));
      }
    };

    const onUp = () => {
      const pane = resizingRef.current;
      if (!pane) return;
      const sizes = paneSizesRef.current;
      if (pane === 'left') localStorage.setItem(LEFT_WIDTH_KEY, String(sizes.leftWidth));
      if (pane === 'right') localStorage.setItem(RIGHT_WIDTH_KEY, String(sizes.rightWidth));
      if (pane === 'bottom') localStorage.setItem(BOTTOM_HEIGHT_KEY, String(sizes.bottomHeight));
      if (pane === 'bottom-left') localStorage.setItem(BOTTOM_LEFT_WIDTH_KEY, String(sizes.bottomLeftWidth));
      resizingRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, []);

  return (
    <main className="vfx-new-landing">
      <header className="vfx-new-toolbar">
        <h2>VFX (New)</h2>
      </header>

      <div ref={workspaceRef} className="vfx-new-workspace">
        <div className="vfx-new-main-row">
        <aside className="vfx-new-panel vfx-new-panel-left" style={{ width: leftWidth }}>
          <div className="vfx-new-duration-scroll-shell">
            <div ref={durationScrollRef} className="vfx-new-duration-scroll" onWheel={handleDurationWheel}>
              <label className="ycs-field-row vfx-new-duration-field">
                <span className="ycs-field-label">Duration</span>
                <span className="ycs-field-control">
                  <input
                    className="ycs-string-input"
                    type="number"
                    min="1"
                    max="12000"
                    step="1"
                    value={durationTicks}
                    onChange={updateDuration}
                    title="Effect duration in ticks"
                  />
                </span>
              </label>
            </div>
            {durationScrollbar.visible && (
              <div className="vfx-new-duration-scrollbar" aria-hidden="true">
                <span
                  className="vfx-new-duration-scrollbar-thumb"
                  style={{ left: durationScrollbar.left, width: durationScrollbar.width }}
                  onPointerDown={startDurationThumbDrag}
                  onPointerMove={moveDurationThumbDrag}
                  onPointerUp={stopDurationThumbDrag}
                  onPointerCancel={stopDurationThumbDrag}
                />
              </div>
            )}
          </div>
          <div className="vfx-new-objects-header">
            <span>Objects</span>
          </div>
          <div className="vfx-new-object-list-shell">
            <div ref={objectListScrollRef} className="vfx-new-object-list">
              {visibleTimelineObjects.map(object => (
                <div
                  key={object.id}
                  className={`vfx-new-object-row ${selectedObjectId === object.id ? 'selected' : ''}`}
                  role="button"
                  tabIndex="0"
                  onClick={() => setSelectedObjectId(object.id)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedObjectId(object.id);
                    }
                  }}
                >
                  <span className="vfx-new-object-icon" />
                  {renamingObject?.id === object.id && renamingObject.source === 'objects' ? (
                    <input
                      autoFocus
                      className="vfx-new-inline-name-input"
                      value={renameValue}
                      onClick={event => event.stopPropagation()}
                      onChange={event => setRenameValue(event.target.value)}
                      onBlur={commitObjectRename}
                      onKeyDown={event => {
                        event.stopPropagation();
                        if (event.key === 'Enter') event.currentTarget.blur();
                        if (event.key === 'Escape') {
                          setRenamingObject(null);
                          setRenameValue(object.name);
                        }
                      }}
                    />
                  ) : (
                    <span
                      className="vfx-new-object-name"
                      onDoubleClick={event => beginObjectRename(object, 'objects', event)}
                    >
                      {object.name}
                    </span>
                  )}
                  <button
                    type="button"
                    className="vfx-new-object-delete"
                    onClick={event => deleteObject(object.id, event)}
                    title={`Delete ${object.name}`}
                    aria-label={`Delete ${object.name}`}
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                      <circle cx="9" cy="9" r="9" fill="white" />
                      <line x1="5" y1="9" x2="13" y2="9" stroke="black" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            {objectScrollbar.visible && (
              <div className="vfx-new-overlay-scrollbar vertical objects" aria-hidden="true">
                <span
                  className="vfx-new-overlay-scrollbar-thumb"
                  style={{ top: objectScrollbar.top, height: objectScrollbar.height }}
                  onPointerDown={event => startVerticalThumbDrag('objects', event)}
                  onPointerMove={moveVerticalThumbDrag}
                  onPointerUp={stopVerticalThumbDrag}
                  onPointerCancel={stopVerticalThumbDrag}
                />
              </div>
            )}
          </div>
        </aside>

        <div
          className="vfx-new-resizer vfx-new-resizer-vertical"
          role="separator"
          aria-label="Resize left panel"
          aria-orientation="vertical"
          onMouseDown={event => startResize('left', event)}
        />

        <ThreeDViewport
          className="vfx-new-viewport"
          ariaLabel="VFX creator 3D viewport with grid and front indicator"
          objects={timelineObjects}
        />

        <div
          className="vfx-new-resizer vfx-new-resizer-vertical"
          role="separator"
          aria-label="Resize right panel"
          aria-orientation="vertical"
          onMouseDown={event => startResize('right', event)}
        />

        <aside className="vfx-new-panel vfx-new-panel-right" style={{ width: rightWidth }}>
          <div className="vfx-new-inspector-header">Inspector</div>
          <div className="vfx-new-inspector-shell">
            <div ref={inspectorScrollRef} className="vfx-new-inspector-fields">
              <div className="vfx-new-inspector-fields-inner">
                {selectedObject ? (
                  <>
                    <FieldRow label="Position">
                      <VectorFields
                        value={selectedObject.position}
                        onChange={(axis, value) => updateObjectVector(selectedObject.id, 'position', axis, value)}
                      />
                    </FieldRow>
                    <FieldRow label="Rotation">
                      <VectorFields
                        value={selectedObject.rotation}
                        onChange={(axis, value) => updateObjectVector(selectedObject.id, 'rotation', axis, value)}
                      />
                    </FieldRow>
                    <FieldRow label="Scale">
                      <VectorFields
                        value={selectedObject.scale}
                        onChange={(axis, value) => updateObjectVector(selectedObject.id, 'scale', axis, value)}
                      />
                    </FieldRow>
                    <FieldRow label="Texture">
                      <StringField
                        value={selectedObject.texture}
                        onChange={texture => updateObject(selectedObject.id, { texture })}
                        style={{ width: '100%' }}
                      />
                    </FieldRow>
                    <FieldRow label="Opacity">
                      <NumberInput
                        value={selectedObject.opacity}
                        onChange={opacity => updateObject(selectedObject.id, { opacity })}
                        style={{ width: '100%' }}
                      />
                    </FieldRow>
                    <FieldRow label="Billboard">
                      <input
                        type="checkbox"
                        checked={selectedObject.billboard}
                        onChange={event => updateObject(selectedObject.id, { billboard: event.target.checked })}
                      />
                    </FieldRow>
                    <FieldRow label="Full Bright">
                      <input
                        type="checkbox"
                        checked={selectedObject.fullBright}
                        onChange={event => updateObject(selectedObject.id, { fullBright: event.target.checked })}
                      />
                    </FieldRow>
                  </>
                ) : (
                  <div className="vfx-new-inspector-empty">Select an object.</div>
                )}
              </div>
            </div>
            {inspectorScrollbar.visible && (
              <div className="vfx-new-overlay-scrollbar vertical inspector" aria-hidden="true">
                <span
                  className="vfx-new-overlay-scrollbar-thumb"
                  style={{ top: inspectorScrollbar.top, height: inspectorScrollbar.height }}
                  onPointerDown={event => startVerticalThumbDrag('inspector', event)}
                  onPointerMove={moveVerticalThumbDrag}
                  onPointerUp={stopVerticalThumbDrag}
                  onPointerCancel={stopVerticalThumbDrag}
                />
              </div>
            )}
          </div>
        </aside>
        </div>

        <div
          className="vfx-new-resizer vfx-new-resizer-horizontal"
          role="separator"
          aria-label="Resize bottom panel"
          aria-orientation="horizontal"
          onMouseDown={event => startResize('bottom', event)}
        />

        <div className="vfx-new-panel vfx-new-panel-bottom" style={{ height: bottomHeight }}>
        <div className="vfx-new-bottom-header vfx-new-time-bar">
          <input
            className="ycs-string-input vfx-new-current-time-input"
            type="number"
            min="0"
            max={durationTicks}
            step="1"
            value={previewTickInput}
            aria-label="Current preview time"
            title="Type a tick or drag horizontally to scrub"
            onPointerDown={startCurrentTimeDrag}
            onPointerMove={moveCurrentTimeDrag}
            onPointerUp={stopCurrentTimeDrag}
            onPointerCancel={stopCurrentTimeDrag}
            onFocus={() => { previewTickInputFocusedRef.current = true; }}
            onChange={event => setPreviewTickInput(event.target.value)}
            onBlur={event => {
              previewTickInputFocusedRef.current = false;
              commitPreviewTick(event.target.value);
            }}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault();
                event.currentTarget.blur();
              } else if (event.key === 'Escape') {
                event.preventDefault();
                const currentTick = String(previewTick);
                setPreviewTickInput(currentTick);
                event.currentTarget.value = currentTick;
                event.currentTarget.blur();
              }
            }}
          />
          <span>/ {durationTicks}</span>
          <button
            type="button"
            className="ycs-button icon vfx-new-playback-button"
            onClick={() => setPlaying(current => !current)}
            title={playing ? 'Pause' : 'Play'}
            aria-label={playing ? 'Pause' : 'Play'}
            aria-pressed={playing}
          >
            {playing ? (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 5v14M17 5v14" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 5l11 7-11 7V5Z" />
              </svg>
            )}
          </button>
        </div>
        <div className="vfx-new-bottom-body">
          <div className="vfx-new-bottom-left" style={{ width: bottomLeftWidth }}>
            <div className="vfx-new-bottom-left-ruler-spacer" />
            <div
              ref={leftTimelineScrollRef}
              className="vfx-new-timeline-left-scroll"
              onScroll={event => syncTimelineScroll('left', event)}
            >
              {timelineObjectLayout.map(object => (
                <div key={object.id} className="vfx-new-timeline-layer-group">
                  <div
                    className={`vfx-new-timeline-layer ${selectedObjectId === object.id ? 'selected' : ''}`}
                    onClick={() => setSelectedObjectId(current => current === object.id ? null : object.id)}
                  >
                    <div className="vfx-new-timeline-layer-row">
                      <button
                        type="button"
                        className={`vfx-new-timeline-disclosure ${object.expanded ? 'expanded' : ''}`}
                        onClick={event => {
                          event.stopPropagation();
                          toggleObjectExpanded(object.id);
                        }}
                        title={object.expanded ? `Collapse ${object.name}` : `Expand ${object.name}`}
                        aria-label={object.expanded ? `Collapse ${object.name}` : `Expand ${object.name}`}
                        aria-expanded={object.expanded}
                      >
                        <span />
                      </button>
                      {renamingObject?.id === object.id && renamingObject.source === 'timeline' ? (
                        <input
                          autoFocus
                          className="vfx-new-inline-name-input timeline"
                          value={renameValue}
                          onClick={event => event.stopPropagation()}
                          onChange={event => setRenameValue(event.target.value)}
                          onBlur={commitObjectRename}
                          onKeyDown={event => {
                            event.stopPropagation();
                            if (event.key === 'Enter') event.currentTarget.blur();
                            if (event.key === 'Escape') {
                              setRenamingObject(null);
                              setRenameValue(object.name);
                            }
                          }}
                        />
                      ) : (
                        <span onDoubleClick={event => beginObjectRename(object, 'timeline', event)}>{object.name}</span>
                      )}
                    </div>
                  </div>
                  {object.expanded && <div className="vfx-new-timeline-property-row">Keyframes</div>}
                </div>
              ))}
            </div>
          </div>
          <div
            className="vfx-new-resizer vfx-new-resizer-vertical"
            role="separator"
            aria-label="Resize bottom left section"
            aria-orientation="vertical"
            onMouseDown={event => startResize('bottom-left', event)}
          />
          <div className="vfx-new-bottom-content">
            <div ref={previewBarRef} className="vfx-new-bottom-header vfx-new-preview-bar" onWheel={handleTimelineWheel}>
              <div className="vfx-new-preview-ruler" aria-hidden="true">
                {previewRulerTicks.map(tick => {
                  const percentage = ((tick - timelineView.start) / timelineSpan) * 100;
                  const edgeKind = percentage <= 0.0001
                    ? 'start'
                    : percentage >= 99.9999
                      ? 'end'
                      : '';
                  return (
                    <span
                      key={tick}
                      className={`vfx-new-preview-ruler-tick whole ${edgeKind}`}
                      style={{ left: bufferedPreviewPosition(percentage) }}
                    >
                      <span className="vfx-new-preview-ruler-label">{formatRulerTime(tick)}</span>
                      <span className="vfx-new-preview-ruler-mark" />
                    </span>
                  );
                })}
              </div>
              <div
                className="vfx-new-preview-scrubber"
                role="slider"
                tabIndex="0"
                aria-valuemin={timelineView.start}
                aria-valuemax={timelineView.end}
                aria-valuenow={previewTick}
                aria-label="Preview position"
                title="Drag to scrub; Ctrl+wheel zooms at the cursor; Shift+wheel pans horizontally"
                onPointerDown={event => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  scrubTimelineAt(event.clientX, event.currentTarget);
                }}
                onPointerMove={event => {
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                    scrubTimelineAt(event.clientX, event.currentTarget);
                  }
                }}
                onPointerUp={event => {
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                    event.currentTarget.releasePointerCapture(event.pointerId);
                  }
                }}
                onPointerCancel={event => {
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                    event.currentTarget.releasePointerCapture(event.pointerId);
                  }
                }}
                onKeyDown={event => {
                  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
                  event.preventDefault();
                  const direction = event.key === 'ArrowLeft' ? -1 : 1;
                  setPreviewTick(current => clamp(
                    current + direction,
                    0,
                    durationTicks,
                  ));
                }}
              />
            </div>
            <div
              ref={rightTimelineScrollRef}
              className="vfx-new-bottom-section-content"
              onScroll={event => syncTimelineScroll('right', event)}
              onPointerDown={() => setSelectedObjectId(null)}
            >
              <div className="vfx-new-timeline-track-rows" style={{ height: Math.max(TIMELINE_ROW_HEIGHT, timelineContentHeight) }}>
                {timelineObjectLayout.map(object => (
                  <div key={object.id}>
                    {object.expanded && (
                      <div className="vfx-new-timeline-property-track" style={{ top: object.top + TIMELINE_ROW_HEIGHT }} />
                    )}
                    <div
                      className={`ycs-tab vfx-new-timeline-dummy ${selectedObjectId === object.id ? 'selected' : ''}`}
                      style={{ top: object.top, left: object.left, width: Math.max(1, object.right - object.left) }}
                      role="slider"
                      aria-label={`${object.name} timeline range`}
                      aria-valuemin="0"
                      aria-valuemax={durationTicks}
                      aria-valuetext={`${object.start} to ${object.end}`}
                      onPointerDown={event => startTimelineObjectDrag(object.id, 'move', event)}
                      onPointerMove={moveTimelineObjectDrag}
                      onPointerUp={stopTimelineObjectDrag}
                      onPointerCancel={stopTimelineObjectDrag}
                    >
                      <span
                        className="vfx-new-timeline-dummy-handle start"
                        onPointerDown={event => startTimelineObjectDrag(object.id, 'start', event)}
                        onPointerMove={moveTimelineObjectDrag}
                        onPointerUp={stopTimelineObjectDrag}
                        onPointerCancel={stopTimelineObjectDrag}
                      />
                      <span className="vfx-new-timeline-dummy-label">{object.name}</span>
                      <span
                        className="vfx-new-timeline-dummy-handle end"
                        onPointerDown={event => startTimelineObjectDrag(object.id, 'end', event)}
                        onPointerMove={moveTimelineObjectDrag}
                        onPointerUp={stopTimelineObjectDrag}
                        onPointerCancel={stopTimelineObjectDrag}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {timelineScrollbar.visible && (
              <div className="vfx-new-overlay-scrollbar vertical timeline" aria-hidden="true">
                <span
                  className="vfx-new-overlay-scrollbar-thumb"
                  style={{ top: timelineScrollbar.top, height: timelineScrollbar.height }}
                  onPointerDown={event => startVerticalThumbDrag('timeline', event)}
                  onPointerMove={moveVerticalThumbDrag}
                  onPointerUp={stopVerticalThumbDrag}
                  onPointerCancel={stopVerticalThumbDrag}
                />
              </div>
            )}
            <div
              className="vfx-new-preview-playhead"
              style={{ left: bufferedPreviewPosition(previewPosition) }}
              aria-hidden="true"
            >
              <span className="vfx-new-preview-pointer" />
              <span className="vfx-new-preview-line" />
            </div>
          </div>
        </div>
        </div>
      </div>
    </main>
  );
}

export default VfxNewLanding;
