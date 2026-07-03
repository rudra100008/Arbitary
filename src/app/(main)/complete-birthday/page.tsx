"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import BirthdayHeader from "./_components/birthday-header";
import BirthdayForm from "./_components/birthday-form";

export default function CompleteBirthdayPage() {
  const router = useRouter();
  const { update } = useSession();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    document.title = "Confirm your birthday | Arbitrary";
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const formData = new FormData(e.currentTarget);
    const dateOfBirth = formData.get("dateOfBirth") as string;

    if (!dateOfBirth) {
      setError("Date of birth is required.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/user/birthday", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateOfBirth }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setIsLoading(false);
        return;
      }

      // Refresh the client-side session so useSession() picks up the
      // freshly-patched cookie without a full page reload.
      await update();
      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10
                    relative overflow-hidden selection:bg-[#FACC15] selection:text-black"
    >
      <style>{`
        @keyframes floatUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .float-up   { animation: floatUp 0.5s cubic-bezier(0.23,1,0.32,1) forwards; }
        .float-up-2 { animation: floatUp 0.5s cubic-bezier(0.23,1,0.32,1) 0.07s forwards; opacity: 0; }
      `}</style>

      <div className="relative z-10 w-full max-w-sm">
        <BirthdayHeader />
        <BirthdayForm
          error={error}
          isLoading={isLoading}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
