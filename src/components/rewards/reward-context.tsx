"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";

type FloatingReward = {
  id: string;
  x: number;
  y: number;
  points: number;
  label: string;
};

type RewardContextValue = {
  triggerReward: (
    x: number,
    y: number,
    points: number,
    label?: string,
  ) => void;
};

const RewardContext = createContext<RewardContextValue>({
  triggerReward: () => {},
});

export function useReward() {
  return useContext(RewardContext);
}

let rewardIdCounter = 0;

export function RewardProvider({ children }: { children: ReactNode }) {
  const [rewards, setRewards] = useState<FloatingReward[]>([]);

  const triggerReward = useCallback(
    (x: number, y: number, points: number, label = "+{pts}") => {
      const id = `reward-${++rewardIdCounter}`;
      const displayLabel = label.replace("{pts}", String(points));
      setRewards((prev) => [...prev, { id, x, y, points, label: displayLabel }]);
      setTimeout(() => {
        setRewards((prev) => prev.filter((r) => r.id !== id));
      }, 1500);
    },
    [],
  );

  return (
    <RewardContext.Provider value={{ triggerReward }}>
      {children}
      <AnimatePresence>
        {rewards.map((reward) => (
          <motion.div
            key={reward.id}
            initial={{ opacity: 1, y: 0, scale: 0.5, x: "-50%" }}
            animate={{ opacity: 0, y: -120, scale: 1.2, x: "-50%" }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="fixed pointer-events-none z-[99999]"
            style={{
              left: `${reward.x}px`,
              top: `${reward.y}px`,
            }}
          >
            <span className="text-lg font-black text-[#FACC15] drop-shadow-[0_0_12px_rgba(250,204,21,0.6)] bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-xl whitespace-nowrap">
              {reward.label}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </RewardContext.Provider>
  );
}
