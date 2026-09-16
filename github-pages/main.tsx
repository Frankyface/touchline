import { createRoot } from "react-dom/client";
import Notebook from "../components/touchline/notebook";
import { browserNotebookStore } from "./browser-store";
import "../app/globals.css";
import "../app/workspace.css";
import "../app/refinements.css";

createRoot(document.getElementById("root")!).render(
  <Notebook store={browserNotebookStore} homeHref="./" />,
);
