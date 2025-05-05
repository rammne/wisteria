import express from 'express';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  onAuthStateChanged
} from 'firebase/auth';
import { get, push, remove, getDatabase, ref, set } from 'firebase/database';
import session from 'express-session';

const app = express();
const port = 3000;

const firebaseConfig = {
  apiKey: "AIzaSyAXSrvXlriajK-IMacwN4z9xY3mtkW5KPs",
  authDomain: "wisteria-7dc52.firebaseapp.com",
  databaseURL: "https://wisteria-7dc52-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "wisteria-7dc52",
  storageBucket: "wisteria-7dc52.firebasestorage.app",
  messagingSenderId: "67244581472",
  appId: "1:67244581472:web:2faa9ec7bfa4979539d905"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getDatabase(firebaseApp);
const postsRef = ref(db, 'posts');

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: 'your-session-secret',
  resave: false,
  saveUninitialized: false
}));

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login');
  }
};

// Login routes
app.get('/login', (req, res) => {
  res.render('login.ejs', { error: null });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    req.session.user = { email: userCredential.user.email, uid: userCredential.user.uid };
    res.redirect('/');
  } catch (error) {
    res.render('login.ejs', { error: 'Invalid email or password' });
  }
});

// Register routes
app.get('/register', (req, res) => {
  res.render('register.ejs', { error: null });
});

app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    req.session.user = { email: userCredential.user.email, uid: userCredential.user.uid };
    res.redirect('/');
  } catch (error) {
    res.render('register.ejs', { error: 'Failed to create account. Email might be in use.' });
  }
});

// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// Protected home route
app.get('/', requireAuth, async (req, res) => {
  const snapshot = await get(postsRef);
  let posts = [];
  if (snapshot.exists()) {
    const data = snapshot.val();
    if (data) {
      posts = await Promise.all(Object.entries(data).map(async ([id, post]) => {
        // Handle both old and new post formats
        const postData = {
          id,
          content: post.content,
          authorEmail: post.authorEmail,
          authorId: post.authorId,
          timestamp: post.timestamp
        };

        // Fetch comments if they exist
        const commentsSnapshot = await get(ref(db, `comments/${id}`));
        const comments = commentsSnapshot.exists() ? commentsSnapshot.val() : {};
        
        return {
          ...postData,
          comments: Object.entries(comments || {}).map(([commentId, comment]) => ({
            id: commentId,
            ...comment,
            replies: Object.entries(comment.replies || {}).map(([replyId, reply]) => ({
              id: replyId,
              ...reply
            }))
          }))
        };
      }));
      posts.reverse();
    }
  }
  res.render('home_page.ejs', { posts, user: req.session.user });
});

// Create a new post
app.post('/submit-post', requireAuth, async (req, res) => {
  const { content } = req.body;
  if (content && content.trim() !== '') {
    const newPostRef = push(postsRef);
    await set(newPostRef, {
      content: content.trim(),
      authorId: req.session.user.uid,
      authorEmail: req.session.user.email,
      timestamp: Date.now()
    });
  }
  res.redirect('/');
});

// Add a comment to a post
app.post('/posts/:postId/comments', requireAuth, async (req, res) => {
  const { postId } = req.params;
  const { content } = req.body;
  
  if (content && content.trim() !== '') {
    const commentsRef = ref(db, `comments/${postId}`);
    const newCommentRef = push(commentsRef);
    await set(newCommentRef, {
      content: content.trim(),
      authorId: req.session.user.uid,
      authorEmail: req.session.user.email,
      timestamp: Date.now(),
      replies: {}
    });
  }
  res.redirect('/');
});

// Add a reply to a comment
app.post('/posts/:postId/comments/:commentId/replies', requireAuth, async (req, res) => {
  const { postId, commentId } = req.params;
  const { content } = req.body;
  
  if (content && content.trim() !== '') {
    const repliesRef = ref(db, `comments/${postId}/${commentId}/replies`);
    const newReplyRef = push(repliesRef);
    await set(newReplyRef, {
      content: content.trim(),
      authorId: req.session.user.uid,
      authorEmail: req.session.user.email,
      timestamp: Date.now()
    });
  }
  res.redirect('/');
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});