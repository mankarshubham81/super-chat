// MessageInput.tsx
import React, { useState } from "react";

export default function MessageInput({
  onSend,
  onTyping,
}: {
  onSend: (message: string, imageUrl?: string) => void;
  onTyping?: () => void;
}) {
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      alert("File size too large (max 10MB)");
      return;
    }
  
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);
  
    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData }
      );
      if (!response.ok) throw new Error('Upload failed');
      const data = await response.json();
      setImageUrl(data.secure_url);
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Image upload failed - please check console for details");
    } finally {
      setUploading(false);
    }
  };

  const handleSend = () => {
    if (message.trim() || imageUrl) {
      onSend(message.trim(), imageUrl || undefined);
      setMessage("");
      setImageUrl(null);
    }
  };

  return (
    <div className="flex flex-col w-full">
      {imageUrl && (
        <div className="relative mb-2">
          <img
            src={imageUrl}
            alt="Preview"
            className="max-w-[150px] h-auto rounded-lg border-2 border-purple-500"
          />
          <button
            onClick={() => setImageUrl(null)}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex items-center space-x-2">
        <label className="cursor-pointer p-2 hover:bg-purple-100 rounded-lg transition-colors">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
          />
          <svg
            className="w-6 h-6 text-purple-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </label>

        <input
          type="text"
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            if (onTyping) onTyping();
          }}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type a message..."
          className="flex-grow bg-gray-100 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />

        <button
          onClick={handleSend}
          disabled={!message.trim() && !imageUrl || uploading}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? "Uploading..." : "Send"}
        </button>
      </div>
    </div>
  );
}