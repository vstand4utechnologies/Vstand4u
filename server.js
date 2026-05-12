const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const session = require("express-session");

const path = require("path");


const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));



app.use(session({
    secret: "vstand4u-secret-key-2024",
    resave: true,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000, httpOnly: true, secure: false }
}));

// Replace with your MongoDB Atlas URL: mongodb+srv://user:pass@cluster.mongodb.net/studentportal
mongoose.connect("mongodb://vstand4u:Vstand4U%40123%24@ac-j38ec4q-shard-00-00.xrcrhdc.mongodb.net:27017,ac-j38ec4q-shard-00-01.xrcrhdc.mongodb.net:27017,ac-j38ec4q-shard-00-02.xrcrhdc.mongodb.net:27017/studentportal?ssl=true&replicaSet=atlas-wid2rw-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0")
.then(() => {
    console.log("MongoDB Connected");
})

const studentSchema = new mongoose.Schema({
    name: String, email: { type: String, unique: true }, phone: String,
    college: String, password: String, completedVideos: [String],
    testScore: { type: Number, default: -1 }, certificateIssued: { type: Boolean, default: false },
    approvalStatus: { type: String, default: 'pending' }, // 'pending', 'approved', 'rejected'
    utrNo: { type: String, default: '' },
    paymentAmount: { type: Number, default: 100 },
    paymentStatus: { type: String, default: 'pending' }, // 'pending', 'verified'
    createdAt: { type: Date, default: Date.now }
});
const Student = mongoose.model("Student", studentSchema);

const videoSchema = new mongoose.Schema({
    title: String, description: String, youtubeUrl: String,
    order: { type: Number, default: 0 }, uploadedAt: { type: Date, default: Date.now }
});
const Video = mongoose.model("Video", videoSchema);

const questionSchema = new mongoose.Schema({ question: String, options: [String], answer: Number });
const Question = mongoose.model("Question", questionSchema);


function requireLogin(req, res, next) {
    if (req.session.studentId) return next();
    res.redirect("/login.html");
}
function requireAdmin(req, res, next) {
    if (req.session && req.session.isAdmin) return next();
    res.status(401).json({ success: false, message: "Not authorized" });
}

app.post("/register", async (req, res) => {
    try {
        const { name, email, phone, college, password, utrNo, paymentAmount } = req.body;
        const existing = await Student.findOne({ email });
        if (existing) return res.json({ success: false, message: "Email already registered. Please login or use a different email." });
        if (!utrNo || utrNo.trim().length < 8) return res.json({ success: false, message: "Please provide a valid Transaction ID / UTR Number." });
        const hashed = await bcrypt.hash(password, 10);
        const student = new Student({ name, email, phone, college, password: hashed, utrNo: utrNo.trim(), paymentAmount: paymentAmount || 100 });
        await student.save();
        res.json({ success: true, message: "Registration successful" });
    } catch (err) { res.json({ success: false, message: "Registration failed. Please try again." }); }
});

app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const student = await Student.findOne({ email });
        if (!student) return res.json({ success: false, message: "Email not found" });
        const match = await bcrypt.compare(password, student.password);
        if (!match) return res.json({ success: false, message: "Wrong password" });
        if (student.approvalStatus === 'pending') return res.json({ success: false, message: "⏳ Your account is pending admin approval. Please wait.", status: "pending" });
        if (student.approvalStatus === 'rejected') return res.json({ success: false, message: "❌ Your registration was not approved. Please contact support.", status: "rejected" });
        req.session.studentId = student._id;
        req.session.studentName = student.name;
        res.json({ success: true, name: student.name });
    } catch (err) { res.json({ success: false, message: "Login failed" }); }
});

app.get("/logout", (req, res) => { req.session.destroy(); res.redirect("/login.html"); });
app.get("/me", requireLogin, async (req, res) => {
    const student = await Student.findById(req.session.studentId).select("-password");
    res.json(student);
});
app.get("/videos-data", requireLogin, async (req, res) => { res.json(await Video.find().sort({ order: 1 })); });
app.get("/video/:id", requireLogin, async (req, res) => { res.json(await Video.findById(req.params.id)); });

app.post("/complete-video", requireLogin, async (req, res) => {
    const { videoId } = req.body;
    const student = await Student.findById(req.session.studentId);
    if (!student.completedVideos.includes(videoId)) { student.completedVideos.push(videoId); await student.save(); }
    res.json({ success: true, completed: student.completedVideos });
});

app.get("/get-progress", requireLogin, async (req, res) => {
    const student = await Student.findById(req.session.studentId);
    const totalVideos = await Video.countDocuments();
    res.json({ completedVideos: student.completedVideos, totalVideos, testScore: student.testScore, certificateIssued: student.certificateIssued });
});

app.get("/get-questions", requireLogin, async (req, res) => {
    const student = await Student.findById(req.session.studentId);
    const totalVideos = await Video.countDocuments();
    if (student.completedVideos.length < totalVideos) return res.json({ allowed: false, message: "Complete all videos first" });
    const questions = await Question.aggregate([{ $sample: { size: 20 } }]);
    res.json({ allowed: true, questions });
});

app.post("/submit-test", requireLogin, async (req, res) => {
    try {
        const { answers } = req.body;
        const questions = await Question.find({ _id: { $in: Object.keys(answers) } });
        let correct = 0;
        questions.forEach(q => { if (parseInt(answers[q._id]) === q.answer) correct++; });
        const score = Math.round((correct / questions.length) * 100);
        const passed = score >= 70;
        const student = await Student.findById(req.session.studentId);
        student.testScore = score;
        if (passed) student.certificateIssued = true;
        await student.save();
        res.json({ success: true, score, passed, correct, total: questions.length });
    } catch (err) { res.json({ success: false, message: "Test submission failed" }); }
});

app.post("/admin-login", (req, res) => {
    const { username, password } = req.body;
    if (username === "admin" && password === "admin123") {
        req.session.isAdmin = true;
        req.session.save((err) => {
            if (err) { console.log("Session save error:", err); return res.json({ success: false, message: "Session error" }); }
            console.log("Admin logged in successfully");
            res.json({ success: true });
        });
    } else { res.json({ success: false, message: "Wrong credentials" }); }
});

app.get("/admin-logout", (req, res) => { req.session.isAdmin = false; res.redirect("/admin-login.html"); });

app.post("/upload-video", requireAdmin, async (req, res) => {
    try {
        const { title, description, youtubeUrl, order } = req.body;
        if (!title || !youtubeUrl) return res.json({ success: false, message: "Title and YouTube URL are required" });
        const video = new Video({ title, description, youtubeUrl, order: parseInt(order) || 0 });
        await video.save();
        res.json({ success: true, message: "Video saved!" });
    } catch (err) { res.json({ success: false, message: err.message }); }
});

app.delete("/delete-video/:id", requireAdmin, async (req, res) => {
    await Video.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

app.post("/add-question", requireAdmin, async (req, res) => {
    try { const { question, options, answer } = req.body; const q = new Question({ question, options, answer: parseInt(answer) }); await q.save(); res.json({ success: true }); }
    catch (err) { res.json({ success: false }); }
});

app.delete("/delete-question/:id", requireAdmin, async (req, res) => { await Question.findByIdAndDelete(req.params.id); res.json({ success: true }); });
app.get("/all-questions", requireAdmin, async (req, res) => { res.json(await Question.find()); });
app.get("/all-students", requireAdmin, async (req, res) => { res.json(await Student.find().select("-password").sort({ createdAt: -1 })); });
app.get("/admin-videos", requireAdmin, async (req, res) => { res.json(await Video.find().sort({ order: 1 })); });
// Approve student (admin only)
app.post("/approve-student/:id", requireAdmin, async (req, res) => {
    try {
        await Student.findByIdAndUpdate(req.params.id, { approvalStatus: 'approved' });
        res.json({ success: true });
    } catch (err) { res.json({ success: false }); }
});

// Reject student (admin only)
app.post("/reject-student/:id", requireAdmin, async (req, res) => {
    try {
        await Student.findByIdAndUpdate(req.params.id, { approvalStatus: 'rejected' });
        res.json({ success: true });
    } catch (err) { res.json({ success: false }); }
});

// Get pending students (admin only)
app.get("/pending-students", requireAdmin, async (req, res) => {
    const students = await Student.find({ approvalStatus: 'pending' }).select("-password").sort({ createdAt: -1 });
    res.json(students);
});

// Admin: reset student password
app.post("/reset-student-password/:id", requireAdmin, async (req, res) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) return res.json({ success: false, message: "Password must be at least 6 characters" });
        const hashed = await bcrypt.hash(newPassword, 10);
        await Student.findByIdAndUpdate(req.params.id, { password: hashed });
        res.json({ success: true, message: "Password reset successfully" });
    } catch (err) { res.json({ success: false, message: "Reset failed" }); }
});

app.get("/check-uploads", (req, res) => { const files = fs.readdirSync(uploadsDir); res.json({ uploadsDir, files }); });

app.listen(3000, () => { console.log("Server running at http://localhost:3000"); });
