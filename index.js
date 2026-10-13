import express from "express"
import { Redis } from "ioredis";

const app = express()
app.use(express.json());

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379"); 

app.post("/post/:id/view",async (req, res) => {
    const { id } = req.params;
    const views = await redis.incr(`post:${id}:views`);
    res.json({ views });
})

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