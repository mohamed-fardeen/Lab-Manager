# Lab Screenshot Manager

A web-based file vault for lab sessions, allowing users to upload, organize, and retrieve screenshots and files across devices using a persistent URL.

## Features

- Folder-based organization for lab sessions
- Drag-and-drop file upload
- Image preview with lightbox view
- Persistent storage using browser localStorage
- Download and delete files
- Mobile responsive interface

## Tech Stack

- React (functional components + hooks)
- TypeScript
- Vite (build tool)
- Inline CSS with CSS variables
- Base64 encoding for file storage

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Open http://localhost:5173 in your browser

## Usage

- Create folders for different lab sessions
- Select a folder and upload files via drag-and-drop or file picker
- View images inline or click to open in lightbox
- Download files or delete them as needed

## Build

Run `npm run build` to build for production.

## Limitations

- Storage limited to browser localStorage (~5MB per key)
- Files up to 4MB each
- No server-side processing; all logic runs in browser