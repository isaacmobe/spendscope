import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { TransactionsProvider } from "./context/TransactionsContext.jsx";

/**
 * main.jsx
 * --------
 * App root entry point.
 * We wrap <App /> in <TransactionsProvider> so every component can access
 * global transaction state via Context.
 */
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <TransactionsProvider>
      <App />
    </TransactionsProvider>
  </React.StrictMode>
);
