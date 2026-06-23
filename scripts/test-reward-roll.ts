import { shouldGrantReward } from "../src/lib/tilt/reward-roll";

const WINDOW_START = new Date("2026-06-23T08:00:00+05:45");
const WINDOW_END = new Date("2026-06-24T00:00:00+05:45");

function randomTimeInWindow(): Date {
    const span = WINDOW_END.getTime() - WINDOW_START.getTime();
    return new Date(WINDOW_START.getTime() + Math.random() * span);
}

function simulateOneDay(totalSubmissions: number): number {
    const times = Array.from({ length: totalSubmissions }, randomTimeInWindow).sort(
        (a, b) => a.getTime() - b.getTime(),
    );

    let winners = 0;
    for (let i = 0; i < times.length; i++) {
        // i+1 = scansToday so far (this person is the (i+1)th scan)
        if (shouldGrantReward(winners, i + 1, times[i], WINDOW_START, WINDOW_END)) winners++;
    }
    return winners;
}

for (const subs of [3, 6, 10, 15, 30, 100, 500]) {
    const trials = 1000;
    const results: number[] = [];
    for (let t = 0; t < trials; t++) results.push(simulateOneDay(subs));
    const avg = results.reduce((a, b) => a + b, 0) / trials;
    const min = Math.min(...results);
    const max = Math.max(...results);
    console.log(`Submissions=${subs}: avg=${avg.toFixed(2)}, min=${min}, max=${max}`);
}