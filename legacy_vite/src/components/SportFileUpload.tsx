import { type ChangeEvent, useRef, useState } from "react";
import type { Sport } from "../data/mockData";
import type { SupportedSportId } from "../utils/excelImport";

type Props = {
  sport: Sport;
  onUpload: (sportId: SupportedSportId, file: File) => Promise<void>;
};

export default function SportFileUpload({ sport, onUpload }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  const handlePick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setStatus("loading");
      setMessage("Importing...");
      await onUpload(sport.id as SupportedSportId, file);
      setStatus("success");
      setMessage(file.name);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Import failed");
    } finally {
      event.target.value = "";
    }
  };

  return (
    <div className="mt-3">
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        type="button"
        onClick={handlePick}
        className="w-full px-3 py-2 rounded-lg text-xs font-medium bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
      >
        Upload Excel
      </button>
      {status !== "idle" && (
        <div
          className={`text-xs mt-2 ${
            status === "error"
              ? "text-red-300"
              : status === "success"
              ? "text-green-300"
              : "text-gray-300"
          }`}
        >
          {message}
        </div>
      )}
    </div>
  );
}
