
import { useState } from "react";
import axios from "axios";
import "./App.css";

const API_URL = "https://bulk-mail-app-backend-5f0k.onrender.com";

function App() {
  const [subject, setSubject] = useState("");
  const [recipients, setRecipients] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSend = async (event) => {
    event.preventDefault();
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

    if (
      !subject.trim() ||
      !body.trim() ||
      recipientList.length === 0
    ) {
      setMessage("Please fill in all fields.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!recipientList.every((email) => emailPattern.test(email))) {
      setMessage("Please check the recipient email addresses.");
      return;
    }

    if (recipientList.length > 100) {
      setMessage("A maximum of 100 recipients is allowed per request.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/api/send-email`,
        {
          subject: subject.trim(),
          body: body.trim(),
          recipients: recipientList,
        }
      );

      setSuccess(true);
      setMessage(
        response.data.message || "Emails sent successfully!"
      );

      setSubject("");
      setRecipients("");
      setBody("");
    } catch (error) {
      setSuccess(false);
      setMessage(
        error.response?.data?.message ||
          "Unable to send emails. Please check the backend and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app-container">
      <header className="app-header">
        <div className="brand-icon">B</div>
        <div>
          <h1>Bulk Mail</h1>
          <p>Simple, reliable email campaigns</p>
        </div>
      </header>

      <section className="mail-card">
        <h2>Compose Email</h2>
        <p className="description">
          Write your message and add the recipients below.
        </p>

        <form onSubmit={handleSend}>
          <label htmlFor="subject">Email Subject</label>
          <input
            id="subject"
            type="text"
            placeholder="Enter email subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            required
          />

          <label htmlFor="recipients">Recipient Emails</label>
          <textarea
            id="recipients"
            placeholder={"person1@example.com\nperson2@example.com"}
            value={recipients}
            onChange={(event) => setRecipients(event.target.value)}
            rows={4}
            required
          />

          <small>
            Separate addresses with commas, semicolons, or new lines.
          </small>

          <label htmlFor="body">Email Message</label>
          <textarea
            id="body"
            placeholder="Write your email message here..."
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={7}
            required
          />

          {message && (
            <div
              className={`status-message ${success ? "success" : "error"}`}
              role="status"
            >
              {message}
            </div>
          )}

          <button type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send Emails"}
          </button>
        </form>
      </section>

      <footer>Bulk Mail App · React + Node.js + MongoDB</footer>
    </main>
  );
}

export default App;