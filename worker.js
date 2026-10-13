import { Queue, Worker } from "bullmq";
import Redis from "ioredis";

const connection = new Redis("redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

const worker = new Worker(
  "emailQueue",
  async (job) => {
    console.log("job started");
    const email = job.data.email;
    console.log("job completed");
  },
  { connection },
);
