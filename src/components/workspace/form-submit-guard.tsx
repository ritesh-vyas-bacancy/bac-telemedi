"use client";

import { useEffect } from "react";

export function FormSubmitGuard() {
  useEffect(() => {
    const onSubmit = (event: Event) => {
      if (!(event.target instanceof HTMLFormElement)) return;

      const form = event.target;
      if (form.dataset.submitting === "true") {
        event.preventDefault();
        return;
      }

      form.dataset.submitting = "true";
      const submitButtons = form.querySelectorAll<HTMLButtonElement>('button[type="submit"]');
      submitButtons.forEach((button) => {
        button.disabled = true;
        button.classList.add("is-submitting");
        const pendingLabel = button.dataset.pendingLabel?.trim();
        const original = button.dataset.originalLabel ?? button.textContent ?? "";
        button.dataset.originalLabel = original;
        button.textContent = pendingLabel && pendingLabel.length > 0 ? pendingLabel : "Processing...";
      });
    };

    document.addEventListener("submit", onSubmit, true);
    return () => {
      document.removeEventListener("submit", onSubmit, true);
    };
  }, []);

  return null;
}

