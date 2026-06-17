'use client';

import { useState } from 'react';

interface TagListProps {
  tags: string[];
  limit?: number;
}

export default function TagList({ tags, limit = 3 }: TagListProps) {
  const [expanded, setExpanded] = useState(false);

  if (tags.length === 0) {
    return <span className="text-xs text-ink-3">—</span>;
  }

  const visible = expanded ? tags : tags.slice(0, limit);
  const overflow = tags.length - limit;

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((tag) => (
        <span
          key={tag}
          className="inline-flex rounded-sm bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-ink-2"
        >
          {tag}
        </span>
      ))}
      {!expanded && overflow > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(true);
          }}
          className="inline-flex rounded-sm bg-accent-soft px-1.5 py-0.5 font-mono text-xs text-accent-text transition-colors duration-150 ease-out hover:bg-surface-2"
        >
          +{overflow}
        </button>
      )}
      {expanded && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(false);
          }}
          className="inline-flex rounded-sm bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-ink-3 transition-colors duration-150 ease-out hover:text-ink"
        >
          less
        </button>
      )}
    </div>
  );
}
