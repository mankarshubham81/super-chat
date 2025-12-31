// EmojiPicker.tsx
import { useEffect, useRef } from 'react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

// Create a local type for the emoji selection
type EmojiSelectData = {
    id: string;
    name: string;
    native: string;
    unified: string;
    shortcodes: string;
    keywords?: string[];
  };
  
  const EmojiPicker = ({
    onSelect,
    onClickOutside,
  }: {
    onSelect: (emoji: EmojiSelectData) => void;
    onClickOutside: () => void;
  }) => {
    const pickerRef = useRef<HTMLDivElement>(null);
  
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
          onClickOutside();
        }
      };
  
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [onClickOutside]);
  
    return (
      <div ref={pickerRef} className="shadow-2xl rounded-xl overflow-hidden">
        <Picker
          data={data}
          theme="dark"
          onEmojiSelect={onSelect}
          previewPosition="none"
          skinTonePosition="none"
          dynamicWidth={true}
          perLine={8}
          navPosition="none"
          searchPosition="none"
        />
      </div>
    );
  };
  
  export default EmojiPicker;
  
