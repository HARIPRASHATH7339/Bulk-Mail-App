
import { useState } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [subject, setSubject] = useState("");
  const [recipients, setRecipients] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async (event) => {
    event.preventDefault();
    setMessage("");

    const recipientList = recipients
      .split(/[,;\n]+/)
      .map((email) => email.trim())
      .filter(Boolean);

    if (!subject.trim() || !body.trim() || recipientList.length === 0) {
      setMessage("Please fill in all fields.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!recipientList.every((email) => emailPattern.test(email))) {
      setMessage("Please check the recipient email addresses.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        "http://localhost:5000/api/send",
        {
          subject,
          body,
          recipients: recipientList,
        }
      );

      setMessage(response.data.message || "Request completed.");
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Unable to send emails. Please check the backend."
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
          <small>Separate addresses with commas, semicolons, or new lines.</small>

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
            <div className="status-message" role="status">
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