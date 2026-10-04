/**
 * exportCsv.js
 * ------------
 * Builds a CSV of the user's transactions so their data is never locked in the app.
 * Cells that start with = + - @ are prefixed with an apostrophe: spreadsheets would otherwise
 * run them as formulas (CSV injection), and titles are free text typed by the user.
 */
const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value) {
  let text = String(value ?? "");
  if (FORMULA_START.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

const pad = (n) => String(n).padStart(2, "0");
const localDate = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export function transactionsToCsv(transactions, areaLabel = (id) => id) {
  const header = ["Date", "Type", "Area", "Title", "Amount", "Currency"];
  const rows = [...transactions]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((t) => [localDate(t.date), t.type, t.type === "income" ? "Earnings" : areaLabel(t.category), t.title, t.amount, t.currency || "KES"]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

// Saves text as a file in the browser. The BOM makes Excel read UTF-8 correctly.
export function downloadText(filename, text, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob(["﻿", text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
