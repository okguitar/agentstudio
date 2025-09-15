import React from 'react';

interface McpIconProps {
  className?: string;
}

export const McpIcon: React.FC<McpIconProps> = ({ className = "w-4 h-4" }) => {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="currentColor" 
      className={className}
    >
      {/* MCP文字图标 - 大号清晰显示 */}
      <text 
        x="12" 
        y="18" 
        textAnchor="middle" 
        fontSize="20" 
        fontFamily="system-ui, -apple-system, sans-serif" 
        fontWeight="700"
      >
        M
      </text>
    </svg>
  );
};