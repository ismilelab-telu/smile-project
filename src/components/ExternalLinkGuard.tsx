import { useCallback, useEffect, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLocalization } from "@/features/localization/localization";

function getExternalHttpUrl(anchor: HTMLAnchorElement) {
  if (anchor.dataset.appLink !== undefined) {
    return null;
  }

  const url = new URL(anchor.href, window.location.href);
  const isHttpUrl = url.protocol === "http:" || url.protocol === "https:";

  return isHttpUrl && url.origin !== window.location.origin ? url : null;
}

function enhanceExternalLinks(root: ParentNode = document) {
  root.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((anchor) => {
    const externalUrl = getExternalHttpUrl(anchor);

    if (!externalUrl) {
      return;
    }

    if (anchor.target !== "_blank") {
      anchor.target = "_blank";
    }

    const relTokens = new Set(anchor.rel.split(/\s+/).filter(Boolean));
    relTokens.add("noopener");
    relTokens.add("noreferrer");

    const nextRel = Array.from(relTokens).join(" ");

    if (anchor.rel !== nextRel) {
      anchor.rel = nextRel;
    }
  });
}

export function ExternalLinkGuard() {
  const { t } = useLocalization();
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  useEffect(() => {
    enhanceExternalLinks();

    const observer = new MutationObserver(() => {
      enhanceExternalLinks();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");

      if (!link) {
        return;
      }

      const externalUrl = getExternalHttpUrl(link);

      if (!externalUrl) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setPendingUrl(externalUrl.href);
    };

    document.addEventListener("click", handleDocumentClick, { capture: true });
    document.addEventListener("auxclick", handleDocumentClick, { capture: true });

    return () => {
      document.removeEventListener("click", handleDocumentClick, { capture: true });
      document.removeEventListener("auxclick", handleDocumentClick, { capture: true });
    };
  }, []);

  const openPendingUrl = useCallback(() => {
    if (!pendingUrl) {
      return;
    }

    window.open(pendingUrl, "_blank", "noopener,noreferrer");
    setPendingUrl(null);
  }, [pendingUrl]);

  return (
    <AlertDialog
      open={pendingUrl !== null}
      onOpenChange={(isOpen) => !isOpen && setPendingUrl(null)}
    >
      <AlertDialogPopup
        className="rounded-lg border border-neutral-200 bg-white shadow-2xl"
        from="top"
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{t("externalLink.title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("externalLink.description")}</AlertDialogDescription>
        </AlertDialogHeader>
        <textarea
          aria-label={t("externalLink.urlLabel")}
          className="mt-5 min-h-14 resize-none overflow-x-auto rounded-md border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-950 outline-none focus-visible:border-neutral-950 focus-visible:ring-2 focus-visible:ring-neutral-950/15 [@media_(min-width:2200px)]:mt-7 [@media_(min-width:2200px)]:text-xl"
          readOnly
          value={pendingUrl ?? ""}
          wrap="off"
        />
        <AlertDialogFooter>
          <AlertDialogCancel>{t("externalLink.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-neutral-950 hover:bg-neutral-800 focus-visible:outline-neutral-950"
            onClick={openPendingUrl}
          >
            {t("externalLink.open")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
}
