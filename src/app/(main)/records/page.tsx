"use client";
import Footer from "@/src/components/ui/footer";
import Header from "@/src/components/ui/header";
import { useEffect } from "react";

export default function RecordsPage() {
  useEffect(() => {
    document.title = "Records | Arbitrary";
  });
  return (
    <div>
      <Header />
      <Footer />
    </div>
  );
}
