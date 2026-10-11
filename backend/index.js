
const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "100kb" }));

const client = new MongoClient(process.env.MONGO_URI);

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function startServer() {
  try {
    await client.connect();
    console.log("MongoDB connected successfully!");

    const db = client.db("bulkMailDB");
    const emailsCollection = db.collection("emails");

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    app.get("/", (req, res) => {
      res.send("Bulk Mail App backend is running!");
    });

    app.get("/api/health", async (req, res) => {
      try {
        await db.command({ ping: 1 });
        res.json({
          success: true,
          message: "Backend and MongoDB are connected!",
        });
      } catch (error) {
        console.error("Health check error:", error.message);
        res.status(500).json({
          success: false,
          message: "Database connection failed.",
        });
      }
    });

    app.post("/api/send", async (req, res) => {
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
          message: "Subject, message, and recipients are required.",
        });
      }

      const cleanRecipients = recipients.map((email) =>
        typeof email === "string" ? email.trim() : ""
      );

      if (
        cleanRecipients.length > 100 ||
        cleanRecipients.some((email) => !emailPattern.test(email))
      ) {
        return res.status(400).json({
          success: false,
          message: "Provide valid email addresses, up to 100 recipients.",
        });
      }

      if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        return res.status(500).json({
          success: false,
          message: "Gmail configuration is missing in .env.",
        });
      }

      const record = {
        subject: subject.trim(),
        body: body.trim(),
        recipients: cleanRecipients,
        status: "sending",
        sentCount: 0,
        failedCount: 0,
        createdAt: new Date(),
      };

      try {
        const insertResult = await emailsCollection.insertOne(record);

        const results = await Promise.allSettled(
          cleanRecipients.map((recipient) =>
            transporter.sendMail({
              from: process.env.GMAIL_USER,
              to: recipient,
              subject: record.subject,
              text: record.body,
            })
          )
        );

        let lastError = "";

        results.forEach((result, index) => {
          if (result.status === "rejected") {
            lastError =
              result.reason?.message || "Unknown email sending error.";

            console.error(`Email ${index + 1} failed:`, lastError);
          }
        });

        const sentCount = results.filter(
          (result) => result.status === "fulfilled"
        ).length;

        const failedCount = results.length - sentCount;

        const status =
          failedCount === 0
            ? "sent"
            : sentCount === 0
              ? "failed"
              : "partial";

        const updateFields = {
          status,
          sentCount,
          failedCount,
          completedAt: new Date(),
        };

        if (lastError) {
          updateFields.error = lastError;
        }

        await emailsCollection.updateOne(
          { _id: insertResult.insertedId },
          { $set: updateFields }
        );

        console.log(
          `Campaign ${insertResult.insertedId}: ${sentCount} sent, ${failedCount} failed`
        );

        res.json({
          success: failedCount === 0,
          message:
            failedCount === 0
              ? `Successfully sent ${sentCount} email(s).`
              : `Sent ${sentCount}; failed ${failedCount}. Check the backend terminal.`,
          sentCount,
          failedCount,
          campaignId: insertResult.insertedId,
        });
      } catch (error) {
        console.error("Email campaign error:", error.message);

        res.status(500).json({
          success: false,
          message: "Campaign processing failed. Check the backend terminal.",
        });
      }
    });

    app.get("/api/history", async (req, res) => {
      try {
        const history = await emailsCollection
          .find(
            {},
            {
              projection: {
                subject: 1,
                recipients: 1,
                status: 1,
                sentCount: 1,
                failedCount: 1,
                error: 1,
                createdAt: 1,
                completedAt: 1,
              },
            }
          )
          .sort({ createdAt: -1 })
          .limit(50)
          .toArray();

        res.json(history);
      } catch (error) {
        console.error("History error:", error.message);

        res.status(500).json({
          success: false,
          message: "Could not load email history.",
        });
      }
    });

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start backend:", error.message);
    process.exit(1);
  }
}

startServer();