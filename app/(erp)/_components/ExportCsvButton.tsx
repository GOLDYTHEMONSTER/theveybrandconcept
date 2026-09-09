"use client";

import { Download } from "lucide-react";
import { downloadCsv, type CsvRow } from "../_lib/csv";

export default function ExportCsvButton({ filename, rows }: { filename: string; rows: CsvRow[] }) {
  return (
    <button
      type="button"
      className="erp-button secondary"
      disabled={rows.length === 0}
      onClick={() => downloadCsv(filename, rows)}
    >
      <Download size={13} style={{ marginRight: 8 }} /> Export CSV
    </button>
  );
}
