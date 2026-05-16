import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  IconActivity,
  IconCheck,
  IconChevronDown,
  IconFlask,
  IconSparkles,
} from "@tabler/icons-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "@/lib/utils";

import { RegressionPreview } from "../features/regression/components/RegressionPreview";

gsap.registerPlugin(useGSAP, SplitText);

const modelGroups = [
  {
    label: "Supervised Learning",
    models: [
      "Simple Linear Regression",
      "Polynomial Regression",
      "Logistic Regression",
      "K-Nearest Neighbors (KNN)",
      "Decision Tree",
      "Random Forest",
      "Support Vector Machine",
      "Naive Bayes",
      "Gradient Boosting / XGBoost",
    ],
  },
  {
    label: "Unsupervised Learning",
    models: ["K-Means Clustering", "DBSCAN", "Gaussian Mixture Model", "PCA", "Autoencoder"],
  },
  {
    label: "Deep Learning",
    models: ["MLP / Neural Network", "CNN", "RNN", "LSTM / GRU", "Transformer", "GAN"],
  },
  {
    label: "Reinforcement Learning",
    models: ["Q-Learning", "Deep Q-Network", "Policy Gradient", "Actor-Critic"],
  },
  {
    label: "Probabilistic / Sequence Models",
    models: ["Hidden Markov Model", "Bayesian Network", "Markov Chain"],
  },
  {
    label: "Association / Pattern Mining",
    models: ["Apriori", "FP-Growth", "Association Rules"],
  },
];

const menuVariants = {
  open: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      type: "spring" as const,
      stiffness: 430,
      damping: 28,
      mass: 0.82,
      delayChildren: 0.04,
      staggerChildren: 0.045,
    },
  },
  closed: {
    opacity: 0,
    y: -14,
    scale: 0.96,
    filter: "blur(5px)",
    transition: {
      duration: 0.18,
      ease: [0.36, 0, 0.66, -0.56] as const,
      staggerChildren: 0.018,
      staggerDirection: -1,
    },
  },
};

const groupVariants = {
  open: {
    opacity: 1,
    y: 0,
    transition: {
      staggerChildren: 0.022,
    },
  },
  closed: {
    opacity: 0,
    y: -8,
    transition: {
      staggerChildren: 0.012,
      staggerDirection: -1,
    },
  },
};

const labelVariants = {
  open: { opacity: 1, y: 0 },
  closed: { opacity: 0, y: -6 },
};

const optionVariants = {
  open: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 520,
      damping: 25,
      mass: 0.72,
    },
  },
  closed: {
    opacity: 0,
    y: -12,
    scale: 0.94,
    transition: {
      duration: 0.14,
    },
  },
};

const optionHighlightTransition = {
  type: "spring" as const,
  stiffness: 420,
  damping: 34,
  mass: 0.82,
};

function getModelGroup(modelName: string) {
  return modelGroups.find((group) => group.models.includes(modelName))?.label ?? "Machine Learning";
}

export function ModelPickerPage() {
  const [selectedModel, setSelectedModel] = useState(modelGroups[0].models[0]);
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
  const [highlightedModel, setHighlightedModel] = useState<string | null>(null);
  const introRef = useRef<HTMLElement>(null);
  const modePickerRef = useRef<HTMLDivElement>(null);
  const modeMenuListRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const selectedGroup = getModelGroup(selectedModel);
  const [highlightFrame, setHighlightFrame] = useState<{
    height: number;
    width: number;
    x: number;
    y: number;
  } | null>(null);

  const updateHighlightFrame = useCallback((optionElement: HTMLElement) => {
    const listElement = modeMenuListRef.current;

    if (!listElement) {
      return;
    }

    let x = 0;
    let y = 0;
    let currentElement: HTMLElement | null = optionElement;

    while (currentElement && currentElement !== listElement) {
      x += currentElement.offsetLeft;
      y += currentElement.offsetTop;
      currentElement = currentElement.offsetParent as HTMLElement | null;
    }

    if (currentElement !== listElement) {
      const listRect = listElement.getBoundingClientRect();
      const optionRect = optionElement.getBoundingClientRect();

      x = optionRect.left - listRect.left;
      y = optionRect.top - listRect.top;
    }

    setHighlightFrame({
      height: optionElement.offsetHeight,
      width: optionElement.offsetWidth,
      x,
      y,
    });
  }, []);

  const updateHighlightFrameForModel = useCallback(
    (modelName: string) => {
      const optionElement = Array.from(
        modeMenuListRef.current?.querySelectorAll<HTMLButtonElement>("[data-model-option]") ?? [],
      ).find((element) => element.dataset.modelOption === modelName);

      if (optionElement) {
        updateHighlightFrame(optionElement);
      }
    },
    [updateHighlightFrame],
  );

  useGSAP(
    () => {
      const introTargets =
        "[data-intro-nav], [data-intro-kicker], [data-intro-title], [data-intro-preview]";

      if (typeof window.matchMedia !== "function") {
        gsap.set(introTargets, {
          autoAlpha: 1,
          clearProps: "all",
        });
        return;
      }

      const motionPreferences = gsap.matchMedia();

      motionPreferences.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(introTargets, {
          autoAlpha: 1,
          clearProps: "all",
        });
      });

      motionPreferences.add("(prefers-reduced-motion: no-preference)", () => {
        const titleElement = introRef.current?.querySelector<HTMLElement>("[data-intro-title]");
        let titleSplit = titleElement
          ? SplitText.create(titleElement, {
              aria: "auto",
              linesClass: "intro-title-line",
              type: "lines",
            })
          : null;

        const timeline = gsap.timeline({
          defaults: {
            clearProps: "transform,opacity,visibility",
            ease: "power3.out",
          },
        });

        timeline
          .from("[data-intro-nav]", {
            autoAlpha: 0,
            duration: 0.5,
            stagger: 0.08,
            y: -14,
          })
          .from(
            "[data-intro-kicker]",
            {
              autoAlpha: 0,
              duration: 0.55,
              y: 18,
            },
            "-=0.18",
          )
          .from(
            titleSplit?.lines ?? [],
            {
              autoAlpha: 0,
              duration: 0.8,
              rotationX: -100,
              stagger: 0.25,
              transformOrigin: "50% 50% -160px",
            },
            "-=0.24",
          )
          .add(() => {
            titleSplit?.revert();
            titleSplit = null;
          })
          .from(
            "[data-intro-preview]",
            {
              autoAlpha: 0,
              duration: 0.85,
              scale: 0.97,
              y: 32,
            },
            "-=0.5",
          );

        return () => {
          titleSplit?.revert();
        };
      });

      return () => {
        motionPreferences.revert();
      };
    },
    { scope: introRef },
  );

  useEffect(() => {
    if (!isModeMenuOpen) {
      setHighlightedModel(null);
      setHighlightFrame(null);
    }
  }, [isModeMenuOpen]);

  useEffect(() => {
    if (!isModeMenuOpen) {
      return;
    }

    const targetModel = highlightedModel ?? selectedModel;
    const frameId = window.requestAnimationFrame(() => {
      updateHighlightFrameForModel(targetModel);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [highlightedModel, isModeMenuOpen, selectedModel, updateHighlightFrameForModel]);

  useEffect(() => {
    if (!isModeMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!modePickerRef.current?.contains(event.target as Node)) {
        setIsModeMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsModeMenuOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isModeMenuOpen]);

  return (
    <main
      className="min-h-screen overflow-hidden text-foreground [background:linear-gradient(135deg,rgb(0_0_0_/_6%),transparent_38%),linear-gradient(235deg,color-mix(in_oklch,var(--muted-foreground)_10%,transparent),transparent_44%),var(--background)]"
      ref={introRef}
    >
      <header
        className="mx-auto flex w-[min(1180px,calc(100%_-_32px))] items-center justify-between gap-4 pt-[22px] pb-2.5 max-[820px]:items-stretch"
        aria-label="Model picker navigation"
      >
        <div className="relative z-10" data-intro-nav ref={modePickerRef}>
          <motion.button
            className="inline-flex min-h-[42px] w-[min(360px,52vw)] min-w-[280px] cursor-pointer items-center justify-between gap-2.5 rounded-xl border border-foreground/[0.14] bg-surface/80 px-3.5 text-foreground shadow-[0_10px_26px_rgb(0_0_0_/_8%)] max-[820px]:w-[min(68vw,320px)] max-[820px]:min-w-0 max-[820px]:max-w-[min(68vw,320px)] [&_svg]:shrink-0"
            type="button"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            aria-haspopup="listbox"
            aria-expanded={isModeMenuOpen}
            aria-controls={listboxId}
            onClick={() => setIsModeMenuOpen((isOpen) => !isOpen)}
          >
            <IconFlask aria-hidden="true" size={18} />
            <span className="flex-1 overflow-hidden text-left text-ellipsis whitespace-nowrap">
              {selectedModel}
            </span>
            <motion.span
              className="inline-flex items-center justify-center"
              aria-hidden="true"
              animate={{ rotate: isModeMenuOpen ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 520, damping: 28 }}
            >
              <IconChevronDown size={17} />
            </motion.span>
          </motion.button>

          <AnimatePresence>
            {isModeMenuOpen ? (
              <motion.div
                className="absolute top-[calc(100%_+_10px)] left-0 max-h-[min(72vh,620px)] w-[min(420px,calc(100vw_-_32px))] origin-top-left overflow-y-auto overscroll-contain rounded-xl border border-foreground/[0.14] bg-surface/90 p-2.5 shadow-[0_22px_54px_rgb(0_0_0_/_16%)] backdrop-blur-[18px] max-[820px]:max-h-[68vh] max-[820px]:w-[min(92vw,420px)]"
                id={listboxId}
                role="listbox"
                aria-label="Machine learning models"
                variants={menuVariants}
                initial="closed"
                animate="open"
                exit="closed"
                onPointerLeave={() => setHighlightedModel(null)}
              >
                <div className="relative" ref={modeMenuListRef}>
                  {highlightFrame ? (
                    <motion.span
                      aria-hidden="true"
                      className="pointer-events-none absolute top-0 left-0 z-0 rounded-md bg-foreground/[0.08]"
                      data-model-option-highlight=""
                      initial={false}
                      animate={highlightFrame}
                      transition={optionHighlightTransition}
                    />
                  ) : null}
                  {modelGroups.map((group, groupIndex) => {
                    const groupLabelId = `${listboxId}-group-${groupIndex}`;

                    return (
                      <motion.div
                        className={cn(
                          "block",
                          groupIndex > 0 && "mt-2.5 border-t border-foreground/10 pt-2.5",
                        )}
                        key={group.label}
                        role="group"
                        aria-labelledby={groupLabelId}
                        variants={groupVariants}
                      >
                        <motion.p
                          className="mx-2 mb-[7px] text-[0.72rem] font-extrabold tracking-normal text-plot-point uppercase"
                          id={groupLabelId}
                          variants={labelVariants}
                        >
                          {group.label}
                        </motion.p>

                        <div className="grid gap-1">
                          {group.models.map((modelName) => {
                            const isSelected = modelName === selectedModel;

                            return (
                              <motion.button
                                className={cn(
                                  "relative z-10 flex min-h-9 w-full cursor-pointer items-center justify-between gap-3 rounded-md border-0 bg-transparent py-2 pr-[9px] pl-2.5 text-left text-ink-soft",
                                  isSelected && "font-extrabold text-foreground",
                                )}
                                data-model-option={modelName}
                                key={modelName}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                variants={optionVariants}
                                onFocus={(event) => {
                                  setHighlightedModel(modelName);
                                  updateHighlightFrame(event.currentTarget);
                                }}
                                onPointerEnter={(event) => {
                                  setHighlightedModel(modelName);
                                  updateHighlightFrame(event.currentTarget);
                                }}
                                onClick={() => {
                                  setSelectedModel(modelName);
                                  setIsModeMenuOpen(false);
                                }}
                              >
                                <span className="relative z-10 min-w-0 [overflow-wrap:anywhere]">
                                  {modelName}
                                </span>
                                <span
                                  className="relative z-10 inline-flex flex-[0_0_18px] items-center justify-center text-foreground"
                                  aria-hidden="true"
                                >
                                  {isSelected ? <IconCheck size={15} /> : null}
                                </span>
                              </motion.button>
                            );
                          })}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <a
          className="inline-flex min-h-[42px] items-center gap-2.5 rounded-xl font-bold text-ink-soft [&_svg]:shrink-0"
          data-intro-nav
          href="/"
          data-app-link
          aria-label="Smile Project home"
        >
          <IconSparkles aria-hidden="true" size={18} />
          <span>Smile Project</span>
        </a>
      </header>

      <section
        className="mx-auto grid min-h-[calc(100vh_-_82px)] w-[min(1180px,calc(100%_-_32px))] grid-cols-[minmax(0,0.78fr)_minmax(420px,1fr)] items-center gap-[clamp(28px,5vw,72px)] pt-9 pb-[72px] max-[820px]:min-h-[auto] max-[820px]:grid-cols-1 max-[820px]:items-start max-[820px]:pt-11"
        aria-labelledby="workspace-title"
      >
        <div className="max-w-[520px]">
          <p
            className="mb-[18px] inline-flex items-center gap-2 text-[0.9rem] font-bold text-kicker"
            data-intro-kicker
            data-testid="selected-model-group"
          >
            <IconActivity aria-hidden="true" size={16} />
            {selectedGroup}
          </p>
          <h1
            className="text-[clamp(2.6rem,5.4vw,5.8rem)] leading-[0.96] text-foreground [perspective:500px]"
            data-intro-title
            id="workspace-title"
          >
            {selectedModel}
          </h1>
        </div>

        <div data-intro-preview>
          <RegressionPreview />
        </div>
      </section>
    </main>
  );
}
