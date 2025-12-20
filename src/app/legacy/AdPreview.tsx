import React, { useState } from "react";

interface AdPreviewProps {
  adUrl: URL;
  onReload: () => void;
}

export function AdPreview({ adUrl, onReload }: AdPreviewProps) {
  return (
    <div className="h-full min-h-[600px] bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col items-center justify-center bg-gray-50 relative group">
      <iframe
        src={adUrl.toString()}
        className="border-0 shadow-lg rounded-lg mb-4"
        width="300"
        height="250"
        title="Ad Preview"
      />

      <button
        onClick={onReload}
        className="px-4 py-2 bg-white text-gray-700 rounded-full shadow-md text-sm font-medium 
                   hover:bg-gray-50 hover:shadow-lg transition-all duration-200 flex items-center gap-2
                   border border-gray-200"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        Replay Animation
      </button>
    </div>
  );
}
