"use client";

import { motion } from "motion/react";

import { LinkPreview } from "@/components/ui/link-preview";

export default function LinkPreviewDemo() {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="flex h-[40rem] flex-col items-center justify-center px-4"
      initial={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <p className="mx-auto mb-10 max-w-3xl text-xl text-neutral-500 md:text-3xl">
        <LinkPreview className="font-bold" url="https://tailwindcss.com">
          Tailwind CSS
        </LinkPreview>{" "}
        and{" "}
        <LinkPreview className="font-bold" url="https://motion.dev">
          Motion
        </LinkPreview>{" "}
        are a great way to build modern websites.
      </p>
      <p className="mx-auto max-w-3xl text-xl text-neutral-500 md:text-3xl">
        Visit{" "}
        <LinkPreview
          className="bg-gradient-to-br from-emerald-500 to-sky-500 bg-clip-text font-bold text-transparent"
          url="https://ui.aceternity.com"
        >
          Aceternity UI
        </LinkPreview>{" "}
        for Tailwind and Motion components.
      </p>
    </motion.div>
  );
}
