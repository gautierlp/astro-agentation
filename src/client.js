// Mounts the Agentation toolbar. The integration adds this to dev server pages only.
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { Agentation } from "agentation";

/** @param {{ path: string, attributes?: string[] }} options */
export function start({ path, attributes }) {
  const host = document.createElement("div");
  host.id = "astro-agentation";
  document.body.append(host);
  const props = { endpoint: location.origin + path };
  if (attributes) props.identifyingAttributes = attributes;
  createRoot(host).render(createElement(Agentation, props));
}
