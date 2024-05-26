declare module 'express-session' {
  interface Session {
    username: string; // Assuming username is a string
  }
}