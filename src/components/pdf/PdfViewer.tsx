import { useCallback, useEffect, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
// A wrapper worker that polyfills newer JS (Map.getOrInsert*) before loading the
// real pdf.js worker, so PDFs render on older WebViews too. `?worker&url` lets
// pdf.js manage the worker lifecycle as it does with the stock worker URL.
import workerSrc from "./pdf.worker?worker&url";
// Styles for the selectable text layer + clickable annotation (link) layer.
import "pdfjs-dist/web/pdf_viewer.css";
import { registerPdfView, clearPdfView, canvasClickToBp } from "./pdfController";
import { open as openUrl } from "@tauri-apps/plugin-shell";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

interface PdfViewerProps {
  data: Uint8Array | null;
  scale: number;
  /** Inverse SyncTeX: invoked on Cmd/Ctrl-click with (page, x, y) in PDF bp. */
  onInverse?: (page: number, x: number, y: number) => void;
}

export function PdfViewer({ data, scale, onInverse }: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onInverseRef = useRef(onInverse);
  onInverseRef.current = onInverse;
  const renderSeqRef = useRef(0);
  // The parsed document is kept across zoom changes so a scale change re-renders
  // pages instead of re-downloading/re-parsing the whole PDF.
  const docRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);

  // Render every page of an already-parsed document at the given scale. Guarded
  // by `renderSeqRef` so a newer render (or unmount) supersedes an in-flight one.
  const renderDoc = useCallback(
    async (doc: pdfjsLib.PDFDocumentProxy, renderScale: number) => {
      const container = containerRef.current;
      if (!container) return;
      const seq = ++renderSeqRef.current;

      container.innerHTML = "";
      const entries: { pageNo: number; canvas: HTMLCanvasElement }[] = [];

      // Minimal link service: opens external links in the system browser,
      // ignores internal destinations (no in-app page router).
      const linkService = {
        externalLinkEnabled: true,
        externalLinkRel: "noopener noreferrer nofollow",
        externalLinkTarget: 2, // BLANK
        isPageVisible: () => true,
        isPageHidden: () => false,
        getDestinationHash: () => "#",
        getAnchorUrl: (hash: string) => hash,
        navigateTo: () => {},
        addLinkAttributes: (link: HTMLAnchorElement) => {
          try {
            link.rel = "noopener noreferrer nofollow";
            link.target = "_blank";
          } catch {
            /* ignore */
          }
        },
      } as any;

      for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p);
        if (seq !== renderSeqRef.current) return;

        const viewport = page.getViewport({ scale: renderScale });
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined;

        const wrap = document.createElement("div");
        wrap.className =
          "relative mb-4 shadow-md ring-1 ring-black/5 rounded-sm overflow-hidden bg-white";
        // pdf.js text layer scales positions off this CSS variable.
        wrap.style.setProperty("--scale-factor", String(renderScale));
        wrap.appendChild(canvas);
        container.appendChild(wrap);

        // Selectable text layer (over the canvas).
        const textDiv = document.createElement("div");
        textDiv.className = "textLayer";
        textDiv.style.position = "absolute";
        textDiv.style.inset = "0";
        textDiv.style.overflow = "hidden";
        wrap.appendChild(textDiv);

        // Clickable annotation layer (links, etc.) - top-most so they work.
        const annotDiv = document.createElement("div");
        annotDiv.className = "annotationLayer";
        annotDiv.style.position = "absolute";
        annotDiv.style.inset = "0";
        wrap.appendChild(annotDiv);

        // Inverse SyncTeX: Cmd/Ctrl-click → (page, x, y) in bp. Attached to
        // the wrap (above the text layer) but skipped on actual links.
        wrap.addEventListener("click", (ev: MouseEvent) => {
          if (!(ev.metaKey || ev.ctrlKey)) return;
          if ((ev.target as HTMLElement)?.closest?.("a")) return;
          const hit = canvasClickToBp(canvas, p, ev);
          if (hit) onInverseRef.current?.(hit.page, hit.x, hit.y);
        });

        entries.push({ pageNo: p, canvas });

        try {
          await page.render({ canvas, canvasContext: ctx, viewport, transform })
            .promise;
        } catch (err) {
          if (!String(err).includes("RenderingCancelled")) throw err;
        }

        // Render text selection (best-effort; never blocks the page).
        try {
          const textLayer = new pdfjsLib.TextLayer({
            textContentSource: page.streamTextContent(),
            container: textDiv,
            viewport,
          } as any);
          await textLayer.render();
        } catch (err) {
          if (!String(err).includes("RenderingCancelled")) {
            /* text selection is a non-fatal enhancement */
          }
        }

        // Render links/annotations (best-effort).
        try {
          const annotations = await page.getAnnotations({ intent: "display" });
          if (seq !== renderSeqRef.current) return;
          const annotationLayer = new pdfjsLib.AnnotationLayer({
            div: annotDiv,
            linkService,
            annotationStorage: doc.annotationStorage,
            page,
            viewport,
          } as any);
          await annotationLayer.render({
            viewport,
            div: annotDiv,
            annotations,
            page,
            linkService,
            annotationStorage: doc.annotationStorage,
            renderForms: false,
            enableScripting: false,
          } as any);
        } catch {
          /* annotation rendering is a non-fatal enhancement */
        }

        // Make external links open in the system browser (webview-safe).
        annotDiv.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((a) => {
          const href = a.getAttribute("href") ?? "";
          if (/^(https?:|mailto:|tel:)/i.test(href)) {
            a.addEventListener("click", (e) => {
              e.preventDefault();
              void openUrl(href);
            });
          }
        });
      }

      if (seq === renderSeqRef.current) {
        registerPdfView({ pages: entries, scale: renderScale });
      }
    },
    []
  );

  // Load (parse) the document when the PDF bytes change — NOT on zoom.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !data) return;

    let loadingTask: pdfjsLib.PDFDocumentLoadingTask | null = null;
    let cancelled = false;

    (async () => {
      try {
        loadingTask = pdfjsLib.getDocument({ data: data.slice() });
        const doc = await loadingTask.promise;
        if (cancelled) return; // cleanup destroys the loading task (and its doc)
        docRef.current = doc;
        await renderDoc(doc, scale);
      } catch (e) {
        if (!cancelled)
          container.textContent = `Failed to render PDF: ${String(e)}`;
      }
    })();

    return () => {
      cancelled = true;
      renderSeqRef.current++;
      clearPdfView();
      docRef.current = null;
      // Destroying the loading task also tears down its PDFDocumentProxy.
      loadingTask?.destroy().catch(() => {});
    };
    // `scale` is intentionally omitted: zoom is handled by the effect below,
    // which re-renders the already-parsed document without reloading it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, renderDoc]);

  // Re-render the already-parsed document on zoom, without reloading it.
  useEffect(() => {
    const doc = docRef.current;
    if (!doc) return; // initial render is driven by the load effect above
    void renderDoc(doc, scale);
  }, [scale, renderDoc]);

  // Crosshair cursor only while ⌘/Ctrl is held - the SyncTeX-click hint.
  // Otherwise the text layer shows the native I-beam and links show the hand.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const set = (on: boolean) => {
      container.style.cursor = on ? "crosshair" : "";
    };
    const down = (e: KeyboardEvent) => set(e.metaKey || e.ctrlKey);
    const up = (e: KeyboardEvent) => set(e.metaKey || e.ctrlKey);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [data]);

  if (!data) return null;
  return <div ref={containerRef} className="flex flex-col items-center p-4" />;
}
