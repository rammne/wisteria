import express from 'express';
import { initializeApp } from 'firebase/app';
import { get, push, remove, getDatabase, ref } from 'firebase/database';

const app = express();
const port = 3000;

const firebaseConfig = {
  databaseURL: 'https://wisteria-7dc52-default-rtdb.asia-southeast1.firebasedatabase.app/',
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);
const dbRef = ref(db, 'posts');

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.get('/', async (req, res) => {
  const snapshot = await get(dbRef);
  let posts = [];
  if (snapshot.exists()) {
    const data = snapshot.val();
    if (data) {
      posts = Object.entries(data).map(([id, value]) => ({ id, value }));
      posts.reverse();
    }
  }
  res.render('home_page.ejs', { posts });
});

app.post('/submit-post', (req, res) => {
  const post = req.body.post;
  if (post && post.trim() !== '') {
    push(dbRef, post.trim());
  }
  res.redirect('/');
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});