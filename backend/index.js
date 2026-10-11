
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { MongoClient, ServerApiVersion } = require("mongodb");
const nodemailer = require("nodemailer");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "100kb" }));

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let db;
let transporter;

async function startServer() {
  try {
    if (!MONGO_URI || !GMAIL_USER || !GMAIL_APP_PASSWORD) {
      throw new Error(
        "Missing required environment variables: MONGO_URI, GMAIL_USER, GMAIL_APP_PASSWORD"
      );
    }

    const client = new MongoClient(MONGO_URI, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });

    await client.connect();
    await client.db("admin").command({ ping: 1 });

    db = client.db("bulkMailDB");
    console.log("MongoDB connected successfully!");

    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD.replace(/\s/g, ""),
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
    });

    app.get("/", (req, res) => {
      res.send("Bulk Mail App backend is running!");
    });

    app.get("/api/health", (req, res) => {
      res.json({
        success: true,
        message: "Backend is running",
        databaseConnected: Boolean(db),
        emailConfigured: Boolean(transporter),
      });
    });

    app.post("/api/send-email", async (req, res) => {
      console.log("Received /api/send-email request");

      let recordId;

      try {
        const { subject, body, recipients } = req.body || {};

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
            message: "Subject, email body, and recipients are required.",
          });
        }

        if (recipients.length > 100) {
          return res.status(400).json({
            success: false,
            message: "A maximum of 100 recipients is allowed.",
          });
        }

        const cleanRecipients = [
          ...new Set(
            recipients
              .filter((email) => typeof email === "string")
              .map((email) => email.trim())
              .filter(Boolean)
          ),
        ];

        if (
          cleanRecipients.length === 0 ||
          cleanRecipients.some((email) => !emailPattern.test(email))
        ) {
          return res.status(400).json({
            success: false,
            message: "Please provide valid recipient email addresses.",
          });
        }

        console.log("Saving email record to MongoDB...");

        const result = await db.collection("emails").insertOne({
          subject: subject.trim(),
          body: body.trim(),
          recipients: cleanRecipients,
          status: "sending",
          sentCount: 0,
          failedCount: 0,
          createdAt: new Date(),
        });

        recordId = result.insertedId;
        console.log("Record saved. Attempting Gmail send...");

        const info = await transporter.sendMail({
          from: GMAIL_USER,
          to: cleanRecipients,
          subject: subject.trim(),
          text: body.trim(),
        });

        console.log("Gmail accepted the message:", info.messageId);

        await db.collection("emails").updateOne(
          { _id: recordId },
          {
            $set: {
              status: "sent",
              sentCount: cleanRecipients.length,
              failedCount: 0,
              messageId: info.messageId,
              completedAt: new Date(),
            },
          }
        );

        return res.json({
          success: true,
          message: "Email sent successfully!",
          sentCount: cleanRecipients.length,
        });
      } catch (error) {
        console.error("Send-email request failed:", error.message);

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
            console.error("Could not update email record:", dbError.message);
          }
        }

        if (!res.headersSent) {
          return res.status(500).json({
            success: false,
            message: "Email failed. Check Render logs for the exact error.",
          });
        }
      }
    });

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start backend:", error.message);
    process.exit(1);
  }
}

startServer();