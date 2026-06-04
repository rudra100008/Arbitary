"use client";
import Footer from "@/src/components/ui/footer";
import Header from "@/src/components/ui/header";
import { useEffect } from "react";

export default function WorkPage() {
  useEffect(() => {
    document.title = "Work | Arbitary";
  });
  return (
    <div>
      <Header />
      <Footer />
    </div>
  );
}
