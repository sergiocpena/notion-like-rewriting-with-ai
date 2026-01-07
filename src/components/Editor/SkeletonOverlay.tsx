interface SkeletonOverlayProps {
  rects: DOMRect[];
}

export function SkeletonOverlay({ rects }: SkeletonOverlayProps) {
  if (rects.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-40">
      {rects.map((rect, index) => (
        <div
          key={index}
          className="absolute skeleton-blur"
          style={{
            top: rect.top - 2,
            left: rect.left - 2,
            width: rect.width + 4,
            height: rect.height + 4,
          }}
        >
          <div className="skeleton-shimmer" />
        </div>
      ))}
    </div>
  );
}
