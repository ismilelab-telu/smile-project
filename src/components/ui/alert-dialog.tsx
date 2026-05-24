import { AlertDialog as AlertDialogPrimitive } from "@base-ui-components/react/alert-dialog";
import { AnimatePresence, motion, type HTMLMotionProps } from "motion/react";
import {
  createContext,
  forwardRef,
  type ComponentProps,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { cn } from "@/lib/utils";

type AlertDialogProps = ComponentProps<typeof AlertDialogPrimitive.Root>;
type AlertDialogOnOpenChange = NonNullable<AlertDialogProps["onOpenChange"]>;

type AlertDialogContextValue = {
  isOpen: boolean;
  setIsOpen: AlertDialogOnOpenChange;
};

const AlertDialogContext = createContext<AlertDialogContextValue | null>(null);

function useAlertDialog() {
  const context = useContext(AlertDialogContext);

  if (!context) {
    throw new Error("AlertDialog components must be used inside AlertDialog.");
  }

  return context;
}

type AlertDialogPortalProps = Omit<
  ComponentProps<typeof AlertDialogPrimitive.Portal>,
  "keepMounted"
>;

type AlertDialogBackdropProps = Omit<
  ComponentProps<typeof AlertDialogPrimitive.Backdrop>,
  "render"
> &
  HTMLMotionProps<"div">;

type AlertDialogPopupProps = Omit<ComponentProps<typeof AlertDialogPrimitive.Popup>, "render"> &
  HTMLMotionProps<"div"> & {
    from?: "bottom" | "left" | "right" | "top";
  };

export function AlertDialog({ defaultOpen, onOpenChange, open, ...props }: AlertDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen ?? false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : uncontrolledOpen;

  const setIsOpen = useCallback<AlertDialogOnOpenChange>(
    (nextOpen, eventDetails) => {
      if (!isControlled) {
        setUncontrolledOpen(nextOpen);
      }

      onOpenChange?.(nextOpen, eventDetails);
    },
    [isControlled, onOpenChange],
  );

  const contextValue = useMemo(() => ({ isOpen, setIsOpen }), [isOpen, setIsOpen]);

  return (
    <AlertDialogContext.Provider value={contextValue}>
      <AlertDialogPrimitive.Root
        data-slot="alert-dialog"
        {...props}
        onOpenChange={setIsOpen}
        open={isOpen}
      />
    </AlertDialogContext.Provider>
  );
}

export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

export function AlertDialogPortal(props: AlertDialogPortalProps) {
  const { isOpen } = useAlertDialog();

  return (
    <AnimatePresence>
      {isOpen ? (
        <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" keepMounted {...props} />
      ) : null}
    </AnimatePresence>
  );
}

export function AlertDialogBackdrop({
  className,
  transition = { duration: 0.2, ease: "easeInOut" },
  ...props
}: AlertDialogBackdropProps) {
  return (
    <AlertDialogPrimitive.Backdrop
      data-slot="alert-dialog-backdrop"
      render={
        <motion.div
          animate={{ opacity: 1, filter: "blur(0px)" }}
          className={cn("fixed inset-0 z-50 bg-neutral-950/35", className)}
          exit={{ opacity: 0, filter: "blur(4px)" }}
          initial={{ opacity: 0, filter: "blur(4px)" }}
          key="alert-dialog-backdrop"
          transition={transition}
          {...props}
        />
      }
    />
  );
}

export function AlertDialogPopup({
  children,
  className,
  from = "top",
  transition = { damping: 25, stiffness: 150, type: "spring" },
  finalFocus,
  initialFocus,
  ...props
}: AlertDialogPopupProps) {
  const initialRotation = from === "bottom" || from === "left" ? "20deg" : "-20deg";
  const isVertical = from === "top" || from === "bottom";
  const rotateAxis = isVertical ? "rotateX" : "rotateY";
  const initialTransform = `perspective(500px) ${rotateAxis}(${initialRotation}) scale(0.8)`;
  const animateTransform = `perspective(500px) ${rotateAxis}(0deg) scale(1)`;

  return (
    <AlertDialogPortal>
      <AlertDialogBackdrop />
      <AlertDialogPrimitive.Popup
        finalFocus={finalFocus}
        initialFocus={initialFocus}
        render={
          <motion.div
            animate={{
              opacity: 1,
              filter: "blur(0px)",
              transform: animateTransform,
            }}
            className={cn(
              "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%_-_3rem)] -translate-x-1/2 -translate-y-1/2 border-2 border-neutral-950 bg-neutral-100 p-7 text-neutral-950 outline-none sm:max-w-lg [@media_(min-width:2200px)]:max-w-2xl [@media_(min-width:2200px)]:p-10",
              className,
            )}
            data-slot="alert-dialog-popup"
            exit={{
              opacity: 0,
              filter: "blur(4px)",
              transform: initialTransform,
            }}
            initial={{
              opacity: 0,
              filter: "blur(4px)",
              transform: initialTransform,
            }}
            key="alert-dialog-popup"
            transition={transition}
            {...props}
          >
            {children}
          </motion.div>
        }
      />
    </AlertDialogPortal>
  );
}

export function AlertDialogHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-3", className)} {...props} />;
}

export function AlertDialogFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end [@media_(min-width:2200px)]:mt-10 [@media_(min-width:2200px)]:gap-4",
        className,
      )}
      {...props}
    />
  );
}

export const AlertDialogTitle = forwardRef<
  HTMLParagraphElement,
  ComponentProps<typeof AlertDialogPrimitive.Title>
>(function AlertDialogTitle({ className, ...props }, ref) {
  return (
    <AlertDialogPrimitive.Title
      className={cn(
        "text-2xl leading-tight font-semibold tracking-normal text-neutral-950 [@media_(min-width:2200px)]:text-4xl",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});

export const AlertDialogDescription = forwardRef<
  HTMLParagraphElement,
  ComponentProps<typeof AlertDialogPrimitive.Description>
>(function AlertDialogDescription({ className, ...props }, ref) {
  return (
    <AlertDialogPrimitive.Description
      className={cn(
        "text-base leading-7 text-neutral-600 [@media_(min-width:2200px)]:text-xl [@media_(min-width:2200px)]:leading-8",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});

export const AlertDialogCancel = forwardRef<
  HTMLButtonElement,
  ComponentProps<typeof AlertDialogPrimitive.Close>
>(function AlertDialogCancel({ className, type = "button", ...props }, ref) {
  return (
    <AlertDialogPrimitive.Close
      className={cn(
        "inline-flex min-h-12 cursor-pointer items-center justify-center bg-neutral-200 px-5 py-3 text-base font-semibold text-neutral-950 transition-colors hover:bg-neutral-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 [@media_(min-width:2200px)]:min-h-16 [@media_(min-width:2200px)]:px-6 [@media_(min-width:2200px)]:py-3.5 [@media_(min-width:2200px)]:text-lg",
        className,
      )}
      ref={ref}
      type={type}
      {...props}
    />
  );
});

export const AlertDialogAction = forwardRef<
  HTMLButtonElement,
  ComponentProps<typeof AlertDialogPrimitive.Close>
>(function AlertDialogAction({ className, type = "button", ...props }, ref) {
  return (
    <AlertDialogPrimitive.Close
      className={cn(
        "inline-flex min-h-12 cursor-pointer items-center justify-center bg-rose-600 px-5 py-3 text-base font-semibold text-neutral-50 transition-colors hover:bg-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 [@media_(min-width:2200px)]:min-h-16 [@media_(min-width:2200px)]:px-6 [@media_(min-width:2200px)]:py-3.5 [@media_(min-width:2200px)]:text-lg",
        className,
      )}
      ref={ref}
      type={type}
      {...props}
    />
  );
});
