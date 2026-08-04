'use client';

import { type ReactNode, useRef, useEffect, useId } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Focusable selectors — ordered by priority. */
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

interface ModalShellProps {
  open: boolean;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
  /**
   * Ref of the element that triggered the modal open.
   * When provided, focus returns to this element on close.
   * If omitted, the previously focused element is used as fallback.
   */
  triggerRef?: { current: HTMLElement | null };
}

export function ModalShell({
  open,
  title,
  subtitle,
  children,
  onClose,
  className,
  triggerRef,
}: ModalShellProps) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const savedFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const subtitleId = useId();

  // ── Body scroll lock ──────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    document.body.classList.add('overflow-hidden');
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [open]);

  // ── Focus management ─────────────────────────────────────────────
  // On open: save current focus, move focus into dialog.
  // On close (cleanup): return focus to trigger or previously saved element.
  useEffect(() => {
    if (!open) return;

    // Capture the trigger at effect-run time, not at cleanup time,
    // because ref.current may change between open and close.
    const triggerElement = triggerRef?.current ?? null;

    // Save the element that was focused before the modal opened.
    savedFocusRef.current = document.activeElement as HTMLElement;

    // Focus the first focusable element inside the dialog (or the dialog itself).
    const dialog = dialogRef.current;
    if (dialog) {
      const focusable = dialog.querySelectorAll<HTMLElement>(FOCUSABLE);
      const target = focusable[0] ?? dialog;
      // Defer one frame so the dialog is painted before receiving focus.
      requestAnimationFrame(() => target.focus());
    }

    return () => {
      // Return focus when the modal closes.
      const target = triggerElement ?? savedFocusRef.current;
      target?.focus();
    };
  }, [open, triggerRef]);

  // ── Keyboard handler (Tab trap + Escape) ─────────────────────────
  function handleKeyDown(e: React.KeyboardEvent<HTMLElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }

    if (e.key !== 'Tab') return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      // Shift+Tab: wrap from first → last
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      // Tab: wrap from last → first
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop — clicking it closes the modal */}
      <button
        type="button"
        aria-label="Cerrar modal"
        className="absolute inset-0 bg-black/65 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subtitleId : undefined}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={cn(
          'relative max-h-[90vh] w-full max-w-lg overflow-y-scroll rounded-2xl border border-border bg-popover p-5 shadow-2xl animate-scale-in sm:p-6 modal-scrollbar',
          className,
        )}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-lg font-bold text-foreground">
              {title}
            </h2>
            {subtitle && (
              <p id={subtitleId} className="mt-1 text-sm text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {children}
      </section>
    </div>
  );
}
