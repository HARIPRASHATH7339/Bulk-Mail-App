
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { MongoClient } = require("mongodb");
const { Resend } = require("resend");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "100kb" }));

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

const client = new MongoClient(MONGO_URI);
const resend = new Resend(RESEND_API_KEY);

let db;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

app.get("/", (req, res) => {
  res.send("Bulk Mail App backend is running!");
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    databaseConnected: Boolean(db),
    resendConfigured: Boolean(RESEND_API_KEY),
  });
});

app.post("/api/send-email", async (req, res) => {
  let recordId;

  try {
    console.log("Received email request");

    const { subject, body, recipients } = req.body;

    if (
      typeof subject !== "string" ||
      !subject.trim() ||
      typeof body !== "string" ||
      !body.trim() ||
      !Array.isArray(recipients) ||
      recipients.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter subject, message and recipient emails.",
      });
    }

    const recipientList = [
      ...new Set(
        recipients
          .filter((email) => typeof email === "string")
          .map((email) => email.trim())
          .filter(Boolean)
      ),
    ];

    if (
      recipientList.length === 0 ||
      recipientList.some((email) => !emailPattern.test(email))
    ) {
      return res.status(400).json({
        success: false,
        message: "Please enter valid email addresses.",
      });
    }

    if (!db || !RESEND_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "Database or email API is not configured.",
      });
    }

    const result = await db.collection("emails").insertOne({
      subject: subject.trim(),
      body: body.trim(),
      recipients: recipientList,
      status: "sending",
      sentCount: 0,
      failedCount: 0,
      createdAt: new Date(),
    });

    recordId = result.insertedId;

    console.log("MongoDB record saved. Sending email...");

    const { data, error } = await resend.emails.send({
      from: "Bulk Mail App <onboarding@resend.dev>",
      to: ["delivered@resend.dev"],
      subject: subject.trim(),
      text: body.trim(),
    });

    if (error) {
      throw new Error(error.message || "Resend API failed");
    }

    await db.collection("emails").updateOne(
      { _id: recordId },
      {
        $set: {
          status: "sent",
          sentCount: recipientList.length,
          failedCount: 0,
          resendId: data?.id || null,
          completedAt: new Date(),
        },
      }
    );

    console.log("Resend accepted test email:", data?.id);

    return res.json({
      success: true,
      message:
        "Resend API test successful. This test does not deliver to the entered recipients.",
      sentCount: recipientList.length,
    });
  } catch (error) {
    console.error("Email sending failed:", error.message);

    if (recordId && db) {
      try {
        await db.collection("emails").updateOne(
          { _id: recordId },
          {
            $set: {
              status: "failed",
              failedCount: 1,
              error: error.message,
              completedAt: new Date(),
            },
          }
        );
      } catch (dbError) {
        console.error("MongoDB update failed:", dbError.message);
      }
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Email sending failed.",
    });
  }
});

async function startServer() {
  try {
    await client.connect();
    db = client.db("bulkMailDB");

    console.log("MongoDB connected successfully!");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Backend startup failed:", error.message);
    process.exit(1);
  }
}

startServer();