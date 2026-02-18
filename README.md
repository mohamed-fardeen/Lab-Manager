# Lab Screenshot Manager

A web-based file vault for lab sessions, allowing users to upload, organize, and retrieve screenshots and files across devices using MongoDB for persistent storage.

## Features

- User management with multiple users
- Nested folder-based organization for lab sessions
- Drag-and-drop file upload
- Image preview with lightbox view
- Cross-device persistent storage using MongoDB
- Download and delete files
- Dark theme UI
- Mobile responsive interface

## Tech Stack

- **Frontend**: React (functional components + hooks) + TypeScript
- **Backend**: Express.js + MongoDB
- **Build Tool**: Vite
- **Styling**: Inline CSS with CSS variables
- **File Storage**: Base64 encoding in MongoDB

## Getting Started (Development)

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file with your MongoDB URI:
   ```
   MONGODB_URI=your_mongodb_connection_string
   ```
4. Start development servers:
   - Frontend: `npm run dev` (runs on http://localhost:5173)
   - Backend: `npm run server` (runs on http://localhost:3001)
5. Open http://localhost:5173 in your browser

## Usage

- Right-click in the users sidebar to add a new user
- Select a user to view their folders
- Navigate through the folder hierarchy
- Upload files via drag-and-drop or file picker in leaf folders
- View images inline or click to open in lightbox
- Download or delete files as needed

## Deployment

### Render Deployment

1. Push this code to GitHub
2. Create a new Web Service on Render
3. Connect your GitHub repository
4. Configure the service:
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
5. Add environment variable:
   - **MONGODB_URI**: Your MongoDB connection string
6. Deploy!

## Build

Run `npm run build` to build the frontend for production.

## API Endpoints

- `GET /api/users` - Get all users
- `POST /api/users` - Create user
- `GET /api/folders/:userId` - Get folders for user
- `POST /api/folders` - Create folder
- `DELETE /api/folders/:id` - Delete folder
- `GET /api/files/:folderId` - Get files in folder
- `POST /api/files` - Upload file
- `DELETE /api/files/:id` - Delete file

## Environment Variables

- `MONGODB_URI` - MongoDB connection string (required)
- `PORT` - Server port (optional, defaults to 3001)