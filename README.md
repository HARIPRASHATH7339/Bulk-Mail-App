# Bulk Mail Application

A full-stack bulk email application built using React, Node.js, Express, MongoDB, and Nodemailer.

## Features

- Compose emails with a subject and message body
- Send emails to multiple recipients
- Validate recipient email addresses
- Send emails using Gmail and Nodemailer
- Store email campaign history in MongoDB
- Track successful and failed email deliveries
- View campaign history through the backend API

## Technologies Used

- React and Vite
- Node.js and Express.js
- MongoDB
- Nodemailer
- Axios
- CSS

## Requirements

- Node.js and npm
- MongoDB
- A Gmail account with a Google App Password

## Setup

### 1. Backend

Open a terminal and run:

\\\powershell
cd backend
npm install
\\\

Create a \.env\ file inside the backend folder with these variables:

\\\env
MONGO_URI=mongodb://127.0.0.1:27017/bulkMailDB
PORT=5000
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-google-app-password
\\\

Replace the Gmail placeholders with your own credentials. Never upload the real \.env\ file to GitHub.

Start the backend:

\\\powershell
node index.js
\\\

### 2. Frontend

Open another terminal and run:

\\\powershell
cd frontend
npm install
npm run dev
\\\

Open the local URL shown by Vite, usually http://localhost:5173.

## API Endpoints

- \GET /api/health\ — Check backend health
- \POST /api/send\ — Send an email campaign
- \GET /api/history\ — Retrieve email campaign history

## Database

MongoDB database: \ulkMailDB\

Collection: \emails\

## Security

Credentials are stored in environment variables. Do not commit your real \.env\ file or Gmail App Password to version control.
