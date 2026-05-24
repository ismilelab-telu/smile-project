import type { ComponentPropsWithoutRef } from "react";

type LearningGridCanvasProps = ComponentPropsWithoutRef<"main">;

export function LearningGridCanvas({
  children,
  className = "",
  ...props
}: LearningGridCanvasProps) {
  return (
    <main
      {...props}
      className={`learning-grid-page relative z-10 isolate min-h-screen text-foreground ${className}`}
    >
      <div className="relative z-10">{children}</div>
    </main>
  );
}

export function LearningSheetExtensions() {
  return (
    <>
      <span aria-hidden="true" className="learning-sheet-outer-line learning-sheet-outer-top" />
      <span aria-hidden="true" className="learning-sheet-outer-line learning-sheet-outer-bottom" />
      <span aria-hidden="true" className="learning-sheet-outer-line learning-sheet-outer-left" />
      <span aria-hidden="true" className="learning-sheet-outer-line learning-sheet-outer-right" />
    </>
  );
}
