import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../index.css";
import PopupApp from "./PopupApp.tsx";
import FocusTimerWidget from "@/components/FocusTimer/FocusTimerWidget.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <FocusTimerWidget />
    <PopupApp />
  </StrictMode>
);
