// Home.tsx is not used directly - AppLayout handles the splash page
// and role-based routing directs to the appropriate dashboard
// This file exists as a fallback
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function Home() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && user) {
      setLocation("/");
    }
  }, [loading, user, setLocation]);

  return null;
}
