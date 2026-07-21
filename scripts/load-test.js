import http from "k6/http";
import { sleep, check } from "k6";

export const options = {
  // Simulate 1000 users connecting at the same time
  stages: [
    { duration: "30s", target: 20 }, // Ramp up to 200 users over 30s
    { duration: "1m", target: 50 }, // Ramp up to 1000 users over 1 min
    { duration: "2m", target: 100 }, // Hold at 1000 users for 2 mins
    { duration: "30s", target: 0 }, // Scale down
  ],
};

export default function loadTest() {
  // Replace with your staging URL
  const res = http.get("https://arbitrary-nu.vercel.app/");

  // Check if the response was successful (Status 200)
  check(res, {
    "is status 200": (r) => r.status === 200,
  });

  // Wait for 1 second between requests to simulate real user thinking time
  sleep(1);
}
