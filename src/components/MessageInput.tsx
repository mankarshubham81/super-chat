import React, { 
  useState, 
  useRef, 
  useEffect, 
  forwardRef, 
  useImperativeHandle 
} from "react";
import Image from "next/image";

export interface MessageInputHandle {
  focus: () => void;
}

interface MessageInputProps {
  onSend: (message: string, imageUrl?: string) => void;
  onTyping?: () => void;
}

const MessageInput = forwardRef<MessageInputHandle, MessageInputProps>(({
  onSend,
  onTyping,
}, ref) => {
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    }
  }), []);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(
        inputRef.current.scrollHeight, 
        128
      )}px`;
    }
  }, [message, previewUrl, imageUrl]);

  const startImageUpload = (file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      alert("File size too large (max 20MB)");
      return;
    }

    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);
    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;

    const uploadTimeout = setTimeout(() => {
      if (xhr.readyState !== 4) {
        xhr.abort();
        handleUploadError("Upload timed out");
      }
    }, 30000);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = (event.loaded / event.total) * 100;
        setUploadProgress(Math.round(percentComplete));
      }
    };

    xhr.onload = () => {
      clearTimeout(uploadTimeout);
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        setImageUrl(data.secure_url);
        URL.revokeObjectURL(preview);
        setPreviewUrl(null);
      } else {
        handleUploadError(`Upload failed: ${xhr.statusText}`);
      }
      setUploading(false);
      xhrRef.current = null;
      inputRef.current?.focus();
    };

    xhr.onerror = () => {
      clearTimeout(uploadTimeout);
      handleUploadError("Upload error");
    };

    xhr.open("POST", `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`);
    xhr.send(formData);
  };

  const handleUploadError = (error: string) => {
    console.error(error);
    alert("Image upload failed");
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setUploading(false);
    setUploadProgress(0);
    xhrRef.current = null;
    inputRef.current?.focus();
  };

  const handleSend = () => {
    if (message.trim() || imageUrl) {
      onSend(message.trim(), imageUrl || undefined);
      setMessage("");
      setImageUrl(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    }
    
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col w-full">
      {(previewUrl || imageUrl) && (
        <div className="relative mb-2 w-32 h-24">
          <Image
            src={previewUrl || imageUrl || ""}
            alt="Preview"
            fill
            className="rounded-lg border-2 border-purple-500 object-contain"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              target.parentElement!.innerHTML = `
                <div class="bg-gray-800 text-gray-400 border border-gray-700 rounded-lg w-full h-full flex items-center justify-center text-xs p-2">
                  Image failed to load
                </div>
              `;
            }}
          />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60 text-white text-xs rounded-lg">
              <div className="bg-gray-700 rounded-full w-16 h-1.5">
                <div 
                  className="bg-green-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}
          <button
            onClick={() => {
              if (uploading) {
                xhrRef.current?.abort();
                setUploading(false);
                setUploadProgress(0);
                if (previewUrl) {
                  URL.revokeObjectURL(previewUrl);
                  setPreviewUrl(null);
                }
              } else {
                setImageUrl(null);
              }
              inputRef.current?.focus();
            }}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors shadow-md"
            aria-label={uploading ? "Cancel upload" : "Remove image"}
          >
            ×
          </button>
        </div>
      )}

      <div className="flex items-center space-x-2">
        <label 
          className="cursor-pointer p-2 hover:bg-purple-800 rounded-lg transition-colors flex items-center justify-center"
          title="Upload image"
        >
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                startImageUpload(file);
              }
              e.target.value = "";
              inputRef.current?.focus();
            }}
          />
          <svg
            className="w-5 h-5 md:w-6 md:h-6 text-purple-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </label>

        <textarea
          ref={inputRef}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            if (onTyping) onTyping();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-grow bg-gray-100 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none overflow-hidden min-h-[44px] max-h-32 text-gray-800"
          rows={1}
          onPaste={() => {
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
        />

        <button
          onClick={handleSend}
          disabled={uploading || (!message.trim() && !imageUrl)}
          className="bg-purple-600 text-white px-3 py-2 md:px-4 md:py-2 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[70px] flex items-center justify-center"
        >
          {uploading ? (
            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <>
              Send
              <svg xmlns="http://www.w3.org/2000/svg" className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
});

// Add display name to fix ESLint error
MessageInput.displayName = "MessageInput";

export default MessageInput;
