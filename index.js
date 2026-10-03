const app = require('./src/server');

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`Social app running on http://localhost:${port}`);
});
