# ⚡ LearnPortal — Student Learning & Certification Portal

A clean, full-stack LMS (Learning Management System) built with Node.js, Express, MongoDB, and vanilla HTML/CSS/JS.

---

## 🗂️ Project Structure

```
student-portal/
│
├── public/                  ← All HTML pages (served to browser)
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html
│   ├── video-player.html
│   ├── test.html
│   ├── certificate.html
│   ├── admin-login.html
│   └── admin-dashboard.html
│
├── uploads/                 ← Uploaded video files (auto-created)
│
├── server.js                ← Main server (all routes + models here)
├── package.json
└── README.md
```

---

## 🚀 Setup & Run

### Step 1 — Install dependencies
```bash
npm install
```

### Step 2 — Make sure MongoDB is running
```bash
# Mac/Linux
mongod

# Windows (run as admin)
net start MongoDB
```

### Step 3 — Start the server
```bash
node server.js
# OR with auto-restart:
npx nodemon server.js
```

### Step 4 — Open in browser
```
http://localhost:3000/register.html   ← Student register
http://localhost:3000/login.html      ← Student login
http://localhost:3000/admin-login.html ← Admin panel
```

---

## 🔐 Default Admin Credentials
```
Username: admin
Password: admin123
```
> ⚠️ Change these in server.js → `/admin-login` route before going live!

---

## 📋 How It Works

### Student Flow
1. Register → Login
2. Dashboard shows all video modules
3. Watch each video (must watch 90%+ to mark complete)
4. After all videos done → Test unlocks
5. Take 20-question MCQ test (20 min timer)
6. Score 70%+ → Certificate generated
7. Download PDF certificate

### Admin Flow
1. Login at `/admin-login.html`
2. Upload videos (title, description, order, MP4 file)
3. Add MCQ questions (question + 4 options + correct answer)
4. View all registered students and their progress

---

## 🛠️ API Endpoints

### Student
| Method | Route | Description |
|--------|-------|-------------|
| POST | /register | Register new student |
| POST | /login | Student login |
| GET | /logout | Logout |
| GET | /me | Get current student info |
| GET | /videos-data | Get all videos |
| GET | /video/:id | Get single video |
| POST | /complete-video | Mark video complete |
| GET | /get-progress | Get student progress |
| GET | /get-questions | Get test questions |
| POST | /submit-test | Submit test answers |

### Admin
| Method | Route | Description |
|--------|-------|-------------|
| POST | /admin-login | Admin login |
| GET | /admin-logout | Admin logout |
| POST | /upload-video | Upload a video |
| DELETE | /delete-video/:id | Delete a video |
| POST | /add-question | Add a question |
| DELETE | /delete-question/:id | Delete a question |
| GET | /all-questions | Get all questions |
| GET | /all-students | Get all students |
| GET | /admin-videos | Get all videos (admin) |

---

## 🎯 Features
- ✅ Student registration & secure login (bcrypt)
- ✅ Session-based authentication
- ✅ Video progress tracking (90% threshold)
- ✅ Anti-skip: cannot seek forward past unwatched portion
- ✅ Test locked until all videos complete
- ✅ 20-question MCQ with 20-minute timer
- ✅ Auto scoring (70% pass mark)
- ✅ PDF certificate generation (jsPDF)
- ✅ Admin panel: upload videos, manage questions, view students
- ✅ Clean dark UI with gradient design
