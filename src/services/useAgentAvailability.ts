import { useCallback, useEffect, useRef, useState } from "react";
import { initialAvailability, parseAvailability } from "./agentAvailability";
import type { AgentAvailability } from "./agentAvailability";
import type { Role } from "../domain/types";
import { agentProfiles } from "./agentProfiles";

export function useAgentAvailability(enabled = true, role: Role = "senior") {
  const [status, setStatus] = useState<AgentAvailability>(initialAvailability);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [refreshing, setRefreshing] = useState(false);
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    if (!enabled || !navigator.onLine || document.hidden || request.current) return;
    const attempt = ++generation.current;
    const controller = new AbortController();
    request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 12000);
    const started = Date.now();
    setRefreshing(true);
    try {
      const response = await fetch(agentProfiles[role].apiBase + "/availability", {
        cache: "no-store", signal: controller.signal,
      });
      if (!response.ok) throw new Error("backend_unreachable");
      // Subtract the round trip so a slow cached response cannot extend freshness.
      const value = parseAvailability(await response.json());
      value.freshUntil -= Date.now() - started;
      if (generation.current === attempt) setStatus(value);
    } catch (error) {
      if (generation.current === attempt) {
        setStatus({ ...initialAvailability, availability: "unavailable",
          reason: error instanceof Error && error.message === "invalid_status" ? "invalid_status" : "backend_unreachable" });
      }
    } finally {
      clearTimeout(timeout);
      if (generation.current === attempt) {
        request.current = null;
        setRefreshing(false);
      }
    }
  }, [enabled, role]);
  useEffect(() => {
    const invalidate = () => {
      generation.current++;
      request.current?.abort();
      request.current = null;
      setRefreshing(false);
    };
    const offline = () => {
      invalidate();
      setOnline(false);
      setStatus({ ...initialAvailability, availability: "offline" });
    };
    const resume = () => {
      setOnline(navigator.onLine);
      if (!navigator.onLine) return offline();
      setStatus((current) => current.availability === "offline" ? initialAvailability : current);
      void refresh();
    };
    const visible = () => { if (!document.hidden) resume(); };
    window.addEventListener("online", resume);
    window.addEventListener("offline", offline);
    window.addEventListener("focus", visible);
    document.addEventListener("visibilitychange", visible);
    resume();
    const poll = setInterval(() => void refresh(), 20000);
    const expiry = setInterval(() => {
      setStatus((current) => ["available", "limited"].includes(current.availability) && current.freshUntil <= Date.now()
        ? { ...current, availability: "stale" } : current);
    }, 1000);
    return () => {
      invalidate();
      clearInterval(poll);
      clearInterval(expiry);
      window.removeEventListener("online", resume);
      window.removeEventListener("offline", offline);
      window.removeEventListener("focus", visible);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [refresh]);
  return { status, online, refreshing, refresh };
}
export type AgentAvailabilityControl = ReturnType<typeof useAgentAvailability>;
