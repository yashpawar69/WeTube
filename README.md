# WeTube — Backend

The backend API for **WeTube**, a YouTube-inspired video-sharing platform. Built with Node.js and Express, it provides authentication, video management, user profiles, likes, comments, subscriptions, tweets, and watch history.

## ✨ Features

- **Authentication & Authorization** — User registration, login, logout, JWT authentication, access-token refresh, and password changes.
- **User Management** — Retrieve user details, update account information, and manage avatars and cover images.
- **Video Management** — Publish, retrieve, update, and delete videos.
- **Video Metadata** — Manage video titles, descriptions, thumbnails, views, and publishing status.
- **Likes** — Like and unlike videos, comments, and tweets.
- **Comments** — Support video discussions and comment interactions.
- **Subscriptions** — Subscribe to channels and manage creator relationships.
- **Watch History** — Retrieve a user's previously watched videos.
- **Channel Profiles** — Retrieve channel information, subscriber counts, and creator details.
- **Tweets** — Create and retrieve user tweets.
- **Media Uploads** — Store video-related images and user profile images using Cloudinary.
- **MongoDB Aggregation** — Join and transform related data for videos, users, and other resources.
- **Middleware** — Handle authentication, request validation, file uploads, and error responses.

## 🛠️ Tech Stack

- **Node.js** — JavaScript runtime
- **Express.js** — REST API framework
- **MongoDB** — Database
- **Mongoose** — Database modeling and queries
- **JWT** — Token-based authentication
- **bcrypt** — Password hashing
- **Cloudinary** — Cloud media storage
- **Multer** — File upload handling
- **CORS** — Cross-origin request configuration
- **dotenv** — Environment variable management

## 📁 Project Structure

```text
wetube-backend/
├── public/
├── src/
│   ├── controllers/     # Business logic
│   ├── db/              # Database connection
│   ├── middlewares/     # Authentication and validation
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API routes
│   ├── utils/           # Helpers and utilities
│   ├── app.js            # Express application
│   ├── constants.js      # Shared constants
│   └── index.js          # Application entry point
├── .env.example
├── package.json
└── README.md
```

*Adjust the structure to match the actual files in your repository.*

## 🚀 Getting Started

### Prerequisites

- Node.js
- npm
- MongoDB instance or MongoDB Atlas account
- Cloudinary account for media uploads

### 1. Clone the repository

```bash
git clone <your-backend-repository-url>
cd wetube-backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root. The following names are illustrative; match them to the variables your backend actually reads.

```env
PORT=8000
MONGODB_URI=your_mongodb_connection_string
CORS_ORIGIN=http://localhost:5173

ACCESS_TOKEN_SECRET=your_access_token_secret
ACCESS_TOKEN_EXPIRY=1d

REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRY=10d

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

Use strong, unique secrets and never commit `.env` to version control.

### 4. Start the server

Use the development script configured in your `package.json`. For example:

```bash
npm run dev
```

If your project uses a different script, run the appropriate command from `package.json`.

The API may be available at:

```text
http://localhost:8000/api/v1
```

Confirm the port and base route in your application configuration.

## 🔌 API Overview

The following table summarizes the main API resource groups.

| Resource | Base path | Purpose |
|---|---|---|
| Users | `/api/v1/users` | Authentication, account settings, profiles, and history |
| Videos | `/api/v1/videos` | Video publishing and retrieval |
| Likes | `/api/v1/likes` | Video, comment, and tweet likes |
| Comments | `/api/v1/comments` | Comment operations |
| Subscriptions | `/api/v1/subscriptions` | Channel subscriptions |
| Tweets | `/api/v1/tweets` | Tweet operations |

### Selected User Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/users/register` | Register a user |
| `POST` | `/users/login` | Authenticate a user |
| `POST` | `/users/logout` | Log out |
| `POST` | `/users/refresh-token` | Refresh authentication tokens |
| `GET` | `/users/current-user` | Retrieve the authenticated user |
| `POST` | `/users/change-password` | Change the current password |
| `PATCH` | `/users/update-account` | Update account information |
| `PATCH` | `/users/avatar` | Update the avatar |
| `PATCH` | `/users/cover-image` | Update the cover image |
| `GET` | `/users/c/:username` | Retrieve a channel profile |
| `GET` | `/users/history` | Retrieve watch history |

Protected endpoints require valid authentication. Exact request bodies, response formats, and authorization requirements depend on the implementation.

## 🔐 Security

- Passwords are hashed before storage.
- Protected routes use JWT verification.
- Refresh tokens support session renewal.
- Environment variables keep secrets outside the source code.
- Request validation helps prevent invalid identifiers and malformed input.
- CORS settings control which frontend origins can access the API.

Never log access tokens, refresh tokens, passwords, or other sensitive credentials.

## 🧪 API Testing

You can test the endpoints using Postman or another HTTP client.

Suggested workflow:

1. Register a user.
2. Log in and verify authentication.
3. Retrieve the current user's profile.
4. Publish a video and retrieve it.
5. Test likes, comments, and subscriptions.
6. Update account details and profile images.
7. Retrieve watch history.

## 🔗 Frontend Integration

The WeTube frontend communicates with this backend through HTTP requests. During local development, configure the frontend's API base URL and ensure the backend's CORS and cookie settings permit requests from the frontend origin.

## 🛣️ Future Improvements

- Add automated unit and integration tests.
- Improve API documentation with Swagger or OpenAPI.
- Add request rate limiting.
- Strengthen input validation and error handling.
- Improve media upload validation and resource cleanup.
- Add production logging and monitoring.

## 🤝 Contributing

Contributions, suggestions, and bug reports are welcome. Fork the repository, create a branch for your changes, and submit a pull request.

## 📄 License

Add a license file before distributing this project publicly.

---

**WeTube Backend** — Powering video sharing, creator profiles, and user interactions.
