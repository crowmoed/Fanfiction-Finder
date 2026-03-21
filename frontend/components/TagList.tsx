'use client';

import { useState } from 'react';

interface TagListProps {
  tags: string[];
  limit?: number;
}

export default function TagList({ tags, limit = 3 }: TagListProps) {
  const [expanded, setExpanded] = useState(false);

  if (tags.length === 0) {
    return <span className="text-xs text-text-tertiary">—</span>;
  }

  const visible = expanded ? tags : tags.slice(0, limit);
  const overflow = tags.length - limit;

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((tag) => (
        <span
          key={tag}
          className="inline-flex px-1.5 py-0.5 rounded-md text-xs font-mono"
          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
        >
          {tag}
        </span>
      ))}
      {!expanded && overflow > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(true);
          }}
          className="inline-flex px-1.5 py-0.5 rounded-md text-xs font-mono transition-colors duration-150"
          style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--accent)' }}
        >
          +{overflow}
        </button>
      )}
      {expanded && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(false);
          }}
          className="inline-flex px-1.5 py-0.5 rounded-md text-xs font-mono transition-colors duration-150"
          style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-tertiary)' }}
        >
          less
        </button>
      )}
    </div>
  );
}
