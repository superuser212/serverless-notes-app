# Serverless Notes App

A full-stack notes application built using AWS serverless services. The app allows users to create, view, and delete notes, with optional file uploads such as images and PDFs. All data is stored and managed through a scalable cloud-based backend.

---

## Live Demo

https://serverless-notes-app.vercel.app

---

## Features

* Create notes with a title and content
* Upload and attach files (images or PDFs)
* Delete notes
* View notes sorted by most recent
* Display timestamps for each note
* Automatic refresh after creating or deleting a note

---

## Architecture

The application follows a serverless architecture:

* API Gateway handles incoming HTTP requests
* AWS Lambda functions process application logic
* DynamoDB stores note data
* Amazon S3 stores uploaded files
* Pre-signed URLs are used for secure file uploads directly to S3

---

## Tech Stack

* Frontend: React with TypeScript (Vite)
* Backend: AWS Lambda (Node.js)
* Database: DynamoDB
* File Storage: Amazon S3
* API Layer: API Gateway
* Deployment: Vercel (frontend), AWS (backend)

---

## How It Works

1. The user submits a note through the frontend

2. If a file is included, the frontend requests a pre-signed upload URL from the backend

3. The file is uploaded directly to S3 using the pre-signed URL

4. The note data (title, content, file URL) is stored in DynamoDB

5. The frontend fetches and displays the updated list of notes

---

## Installation (Frontend)

```bash
git clone https://github.com/your-username/serverless-notes-app.git
cd serverless-notes-app
npm install
npm run dev
```

---

## Environment Variables

Create a `.env` file in the root directory:

```env
VITE_API_BASE_URL=your-api-gateway-url
```

---

## Future Improvements

* Add authentication (e.g., AWS Cognito or JWT-based auth)
* Support editing existing notes
* Implement search and filtering
* Add pagination for larger datasets
* Improve file previews and UI responsiveness

---

## License

This project is available under the MIT License.
