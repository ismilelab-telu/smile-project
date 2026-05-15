import { useEffect, useId, useRef, useState } from "react";
import {
  IconActivity,
  IconCheck,
  IconChevronDown,
  IconFlask,
  IconSparkles,
} from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";

import { RegressionPreview } from "../features/regression/components/RegressionPreview";

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

function getModelGroup(modelName: string) {
  return modelGroups.find((group) => group.models.includes(modelName))?.label ?? "Machine Learning";
}

function classNames(...classes: Array<string | false>) {
  return classes.filter(Boolean).join(" ");
}

export function App() {
  const [selectedModel, setSelectedModel] = useState(modelGroups[0].models[0]);
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
  const modePickerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const selectedGroup = getModelGroup(selectedModel);

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
    <main className="min-h-screen overflow-hidden text-[#172019] [background:linear-gradient(135deg,rgba(43,116,108,0.1),transparent_38%),linear-gradient(235deg,rgba(226,103,80,0.14),transparent_44%),#f7f4ed]">
      <header
        className="mx-auto flex w-[min(1180px,calc(100%_-_32px))] items-center justify-between gap-4 pt-[22px] pb-2.5 max-[820px]:items-stretch"
        aria-label="Playground navigation"
      >
        <div className="relative z-10" ref={modePickerRef}>
          <motion.button
            className="inline-flex min-h-[42px] w-[min(360px,52vw)] min-w-[280px] cursor-pointer items-center justify-between gap-2.5 rounded-xl border border-[rgba(23,32,25,0.12)] bg-white/75 px-3.5 text-[#172019] shadow-[0_10px_26px_rgba(36,44,39,0.08)] max-[820px]:w-[min(68vw,320px)] max-[820px]:min-w-0 max-[820px]:max-w-[min(68vw,320px)] [&_svg]:shrink-0"
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
                className="absolute top-[calc(100%_+_10px)] left-0 max-h-[min(72vh,620px)] w-[min(420px,calc(100vw_-_32px))] origin-top-left overflow-y-auto overscroll-contain rounded-xl border border-[rgba(23,32,25,0.12)] bg-white/90 p-2.5 shadow-[0_22px_54px_rgba(34,40,37,0.18)] backdrop-blur-[18px] max-[820px]:max-h-[68vh] max-[820px]:w-[min(92vw,420px)]"
                id={listboxId}
                role="listbox"
                aria-label="Machine learning models"
                variants={menuVariants}
                initial="closed"
                animate="open"
                exit="closed"
              >
                {modelGroups.map((group, groupIndex) => {
                  const groupLabelId = `${listboxId}-group-${groupIndex}`;

                  return (
                    <motion.div
                      className={classNames(
                        "block",
                        groupIndex > 0 && "mt-2.5 border-t border-[rgba(23,32,25,0.08)] pt-2.5",
                      )}
                      key={group.label}
                      role="group"
                      aria-labelledby={groupLabelId}
                      variants={groupVariants}
                    >
                      <motion.p
                        className="mx-2 mt-0 mb-[7px] text-[0.72rem] font-extrabold tracking-normal text-[#647169] uppercase"
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
                              className={classNames(
                                "flex min-h-9 w-full cursor-pointer items-center justify-between gap-3 rounded-md border-0 bg-transparent py-2 pr-[9px] pl-2.5 text-left text-[#23352e] hover:bg-[rgba(43,116,108,0.1)]",
                                isSelected &&
                                  "bg-[rgba(43,116,108,0.1)] font-extrabold text-[#1d625b]",
                              )}
                              key={modelName}
                              type="button"
                              role="option"
                              aria-selected={isSelected}
                              variants={optionVariants}
                              whileHover={{ x: 4, scale: 1.015 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => {
                                setSelectedModel(modelName);
                                setIsModeMenuOpen(false);
                              }}
                            >
                              <span className="min-w-0 [overflow-wrap:anywhere]">{modelName}</span>
                              <span
                                className="inline-flex flex-[0_0_18px] items-center justify-center text-[#e26750]"
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
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <a
          className="inline-flex min-h-[42px] items-center gap-2.5 rounded-xl font-bold text-[#23352e] [&_svg]:shrink-0"
          href="/"
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
        <motion.div
          className="max-w-[520px]"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <p
            className="mt-0 mr-0 mb-[18px] ml-0 inline-flex items-center gap-2 text-[0.9rem] font-bold text-[#2b746c]"
            data-testid="selected-model-group"
          >
            <IconActivity aria-hidden="true" size={16} />
            {selectedGroup}
          </p>
          <h1
            className="m-0 text-[clamp(2.6rem,5.4vw,5.8rem)] leading-[0.96] text-[#172019]"
            id="workspace-title"
          >
            {selectedModel}
          </h1>
          <p className="mt-[22px] mb-0 max-w-[34rem] text-[1.05rem] leading-[1.65] text-[#526056]">
            A direct workspace for exploring points, trend lines, residuals, and model feedback.
          </p>
        </motion.div>

        <RegressionPreview />
      </section>
    </main>
  );
}
