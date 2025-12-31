// EmojiPicker.tsx
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

type EmojiSelectData = {
  id: string;
  native: string;
};

const EmojiPicker = ({
  onSelect,
  onClickOutside,
}: {
  onSelect: (emoji: EmojiSelectData) => void;
  onClickOutside: () => void;
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>(300);

  // Measure parent width precisely
  useLayoutEffect(() => {
    if (!wrapperRef.current) return;

    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });

    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, []);

  // Outside click handler
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node)
      ) {
        onClickOutside();
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClickOutside]);

  return (
    <div
      ref={wrapperRef}
      className="w-full max-w-full"
    >
      <div
        ref={pickerRef}
        style={{ width }}
        className="
          bg-[#1f2937]
          rounded-xl
          overflow-hidden
          shadow-2xl
        "
      >
        <Picker
          data={data}
          theme="dark"
          onEmojiSelect={onSelect}
          previewPosition="none"
          searchPosition="none"
          skinTonePosition="none"
          navPosition="none"
          perLine={Math.floor(width / 36)}
          style={{
            width: '100%',
            maxWidth: '100%',
          }}
        />
      </div>
    </div>
  );
};

export default EmojiPicker;
