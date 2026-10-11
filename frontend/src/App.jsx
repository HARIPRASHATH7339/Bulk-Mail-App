
import { useState } from "react";
import axios from "axios";
import "./App.css";

const API_URL = "https://bulk-mail-app-backend-5f0k.onrender.com";

function App() {
  const [subject, setSubject] = useState("");
  const [recipients, setRecipients] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSend = async (event) => {
    event.preventDefault();

    if (loading) return;

    setMessage("");
    setSuccess(false);

    const recipientList = [
      ...new Set(
        recipients
          .split(/[,;\s]+/)
          .map((email) => email.trim())
          .filter(Boolean)
      ),
    ];

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!subject.trim() || !body.trim() || recipientList.length === 0) {
      setMessage("Please fill in all fields.");
      return;
    }

    if (!recipientList.every((email) => emailPattern.test(email))) {
      setMessage("Please check the recipient email addresses.");
      return;
    }

    if (recipientList.length > 100) {
      setMessage("You can send to a maximum of 100 recipients at a time.");
      return;
    }

    setLoading(true);
    setMessage("Connecting to the email server...");

    // Prevent an unresponsive request from leaving the button loading forever.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      const response = await axios.post(
        `${API_URL}/api/send-email`,
        {
          subject: subject.trim(),
          body: body.trim(),
          recipients: recipientList,
        },
        {
          timeout: 45000,
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const result = response.data;

      if (result.success === false) {
        setSuccess(false);
        setMessage(result.message || "The server could not send the emails.");
        return;
      }

      setSuccess(true);
      setMessage(result.message || "Email request completed successfully.");
      setSubject("");
      setRecipients("");
      setBody("");
    } catch (error) {
      setSuccess(false);

      if (error.code === "ERR_CANCELED" || error.code === "ECONNABORTED") {
        setMessage(
          "The request timed out. Please check the Render logs before trying again."
        );
      } else if (error.response) {
        setMessage(
          error.response.data?.message ||
            `Server error (${error.response.status}). Please check the backend logs.`
        );
      } else {
        setMessage(
          "Could not reach the backend. Check the internet connection and Render service."
        );
      }

      console.error("Bulk mail request failed:", error);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="brand-icon">✉</div>
        <h1>Bulk Mail App</h1>
        <p>Send emails to multiple recipients in one place.</p>
      </header>

      <main className="mail-card">
        <form onSubmit={handleSend}>
          <div className="form-group">
            <label htmlFor="subject">Email Subject</label>
            <input
              id="subject"
              type="text"
              placeholder="Enter your email subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="recipients">Recipient Emails</label>
            <textarea
              id="recipients"
              placeholder={"Enter email addresses separated by commas or new lines"}
              value={recipients}
              onChange={(event) => setRecipients(event.target.value)}
              disabled={loading}
              rows={4}
              required
            />
            <small>Maximum 100 unique recipients per request.</small>
          </div>

          <div className="form-group">
            <label htmlFor="body">Email Body</label>
            <textarea
              id="body"
              placeholder="Write your email message here..."
              value={body}
              onChange={(event) => setBody(event.target.value)}
              disabled={loading}
              rows={6}
              required
            />
          </div>

          {message && (
            <div
              className={`status-message ${success ? "success" : "error"}`}
              role="status"
              aria-live="polite"
            >
              {loading && <span className="loading-spinner" />}
              {message}
            </div>
          )}

          <button type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send Emails"}
          </button>
        </form>
      </main>

      <footer className="app-footer">
        Bulk Mail App · React, Node.js & MongoDB
      </footer>
    </div>
  );
}

export default App;