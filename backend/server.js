const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Root status check
app.get("/", (req, res) => {
  res.json({
    service: "ChurnSense Backend",
    status: "running",
    endpoints: ["GET /", "GET /health", "POST /predict"],
  });
});

// Health check route
app.get("/health", (req, res) => {
  res.json({ status: "ok", runtime: "node-express" });
});

// Churn prediction route -> calls predict.py
app.post("/predict", (req, res) => {
  const pythonScript = path.join(__dirname, "predict.py");
  // Agar Windows mein 'python' na chale toh 'python3' try kar sakti ho
  const py = spawn("python", [pythonScript]);

  let stdout = "";
  let stderr = "";
  let responseSent = false;

  const sendSafeResponse = (statusCode, payload) => {
    if (!responseSent && !res.headersSent) {
      responseSent = true;
      res.status(statusCode).json(payload);
    }
  };

  py.on("error", (err) => {
    sendSafeResponse(500, {
      error: "Failed to start Python inference process",
      details: err.message,
    });
  });

  py.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });

  py.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  py.on("close", (code) => {
    if (code !== 0) {
      return sendSafeResponse(500, {
        error: "Prediction script failed",
        details: stderr.trim() || `Python exited with code ${code}`,
      });
    }

    try {
      const parsed = JSON.parse(stdout.trim());
      return sendSafeResponse(200, parsed);
    } catch (err) {
      return sendSafeResponse(500, {
        error: "Invalid JSON returned by prediction script",
        rawOutput: stdout.trim(),
        stderr: stderr.trim() || undefined,
      });
    }
  });

  try {
    py.stdin.write(JSON.stringify(req.body ?? {}));
    py.stdin.end();
  } catch (err) {
    sendSafeResponse(500, {
      error: "Failed to send request payload to Python script",
      details: err.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Express server running on http://localhost:${PORT}`);
});