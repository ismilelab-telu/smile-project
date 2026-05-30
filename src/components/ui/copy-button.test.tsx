import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CopyButton } from "./copy-button";

const originalClipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, "clipboard");

describe("CopyButton", () => {
  afterEach(() => {
    vi.restoreAllMocks();

    if (originalClipboardDescriptor) {
      Object.defineProperty(navigator, "clipboard", originalClipboardDescriptor);
      return;
    }

    Reflect.deleteProperty(navigator, "clipboard");
  });

  it("copies the supplied value and switches to the copied state", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(
      <CopyButton
        copiedAriaLabel="Kode disalin"
        copiedLabel="Disalin!"
        copyAriaLabel="Salin kode"
        copyLabel="Salin"
        value="pd.read_csv('data.csv')"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Salin kode" }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("pd.read_csv('data.csv')");
    });
    expect(await screen.findByRole("button", { name: "Kode disalin" })).toBeInTheDocument();
    expect(await screen.findByText("Dis")).toBeInTheDocument();
    expect(screen.getByText("alin")).toBeInTheDocument();
    expect(screen.getByText("!")).toBeInTheDocument();
  });
});
