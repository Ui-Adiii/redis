import express from "express"
import { Redis } from "ioredis";
import emailQueue from "./queue.js";

const app = express()
app.use(express.json());

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379"); 

app.post("/send-otp", async (req, res) => {
  const { email } = req.body;
  await emailQueue.add("send-email", { email });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await redis.set(`otp:${email}`, otp, "EX", 30);

  return res.json({ message:"OTP sent successfully",otp ,success:true});
});
app.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  const cachedOtp = await redis.get(`otp:${email}`);
  if (!cachedOtp) {
    return res
      .status(400)
      .json({ message: "otp not found or has been expired" ,success:false});
  }

  if (cachedOtp != otp) {
    return res.status(400).json({ message: "incorrect otp" });
  }

  await redis.del(`otp:${email}`);
  return res.json({ message: "otp verified" });
});

const rateLimitter = async (req, res, next) => {
  const ip = req.ip;
  const key = `rate_limit:${ip}`;
  const requests = await redis.incr(key);
  if (requests == 1) {
    await redis.expire(key, 60);
  }
  if (requests > 5) {
    return res.status(429).json({ message: "Too Many Requests" });
  }

  next();
};

app.post("/post/:id/view", rateLimitter, async (req, res) => {
  const { id } = req.params;
  const views = await redis.incr(`post:${id}:views`);
  res.json({ views });
});

app.post("/leaderboard/:id/score", async (req, res) => {
    const { id } = req.params;
    const { score } = req.body;
    await redis.zincrby("leaderboard", score, id);
    res.json({ message: "Score added to leaderboard" });
})

app.get("/leaderboard", async (req, res) => {
    const leaderboard = await redis.zrevrange("leaderboard", 0, -1, "WITHSCORES");
    const result = [];

    for (let i = 0; i < leaderboard.length; i += 2) {
      result.push({
        id: leaderboard[i],
        score: Number(leaderboard[i + 1]),
      });
    }

    res.json({ leaderboard: result });
});

app.get("/leaderboard/:id/rank", async (req, res) => {
  const { id } = req.params;
  const rank = await redis.zrevrank("leaderboard", id);
  if (rank === null) {
    return res.status(404).json({ message: "User not found in leaderboard" });
  }
  res.json({ rank: rank + 1 });

})



app.listen(3000, () => {
    console.log("Server is running on port http://localhost:3000");
})