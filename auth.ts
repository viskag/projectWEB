import express from 'express';
import bcrypt from 'bcrypt';
import { User } from './interface';
import { connect, userCollection } from './db/database';
const router = express.Router();
// Registration Route
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    //const db = await connect();
    const hashedPassword = await bcrypt.hash(password, 10);
    const count: number = await userCollection.countDocuments();
    const user: User = { id: count + 1, username, password: hashedPassword };
    await userCollection.insertOne(user);
    res.redirect('/login');
  } catch (error) {
    res.status(500).send('Error registering new user.');
  }
});
// Login Route
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    //const db = await connect();
    //const usersCollection = db.collection<User>('users');
    
    const user = await userCollection.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).send('Invalid credentials.');
    }
    req.session.userId = user.id;
    res.redirect('/dashboard');
  } catch (error) {
    res.status(500).send('Error logging in user.');
  }
});
// Logout Route
router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).send('Error logging out.');
    res.redirect('/login');
  });
});
export default router;