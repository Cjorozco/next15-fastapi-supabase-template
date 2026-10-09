import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval("reset demo data", { hours: 24 }, internal.demo.reset, {});

export default crons;
