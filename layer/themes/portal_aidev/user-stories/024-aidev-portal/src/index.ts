import app from './server';

// Start the server
const PORT = process.env.PORT || 3456;

app.listen(PORT, () => {
  console.log(`AI Dev Portal Server running at http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});