import { Activity, Beaker, ChevronDown, Sparkles } from "lucide-react";
import { motion } from "motion/react";

import { RegressionPreview } from "../features/regression/components/RegressionPreview";

const playgroundModes = ["Simple Linear Regression", "Polynomial Regression", "Classification"];

export function App() {
  return (
    <main className="playground-shell">
      <header className="top-bar" aria-label="Playground navigation">
        <motion.button
          className="mode-trigger"
          type="button"
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
          aria-haspopup="listbox"
          aria-expanded="false"
        >
          <Beaker aria-hidden="true" size={18} />
          <span>{playgroundModes[0]}</span>
          <ChevronDown aria-hidden="true" size={17} />
        </motion.button>

        <a className="brand-mark" href="/" aria-label="Smile Project home">
          <Sparkles aria-hidden="true" size={18} />
          <span>Smile Project</span>
        </a>
      </header>

      <section className="workspace" aria-labelledby="workspace-title">
        <motion.div
          className="workspace-copy"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="eyebrow">
            <Activity aria-hidden="true" size={16} />
            Regression playground
          </p>
          <h1 id="workspace-title">Simple Linear Regression</h1>
          <p className="intro">
            A direct workspace for exploring points, trend lines, residuals, and model feedback.
          </p>
        </motion.div>

        <RegressionPreview />
      </section>
    </main>
  );
}
