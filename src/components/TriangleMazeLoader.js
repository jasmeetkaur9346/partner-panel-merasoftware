import React from 'react';

// Container Component
const LoaderContainer = ({ children, label }) => (
  <div className="flex flex-col items-center justify-center p-4 space-y-2">
    {children}
    <span className="text-sm text-gray-600">{label}</span>
  </div>
);

// Triangle Maze Loader
const TriangleMazeLoader = () => (
  <LoaderContainer label="Loading">
    <div className="relative w-16 h-16">
      <div className="absolute inset-0 animate-spin">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-full h-full border-t-4 border-blue-500"
            style={{
              transform: `rotate(${120 * i}deg)`,
              clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)'
            }}
          />
        ))}
      </div>
    </div>
  </LoaderContainer>
);

export default TriangleMazeLoader;