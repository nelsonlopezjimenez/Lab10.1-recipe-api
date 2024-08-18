import express from 'express';
import router from './routes/routes-recipe.js';
import 'dotenv/config';

const app = express();

const port = process.env.PORT || 3999;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', function (req, res) {
  res.send('this is root route');
});

app.use('/api/recipe', router);

app.listen(port, function () {
  //console.log("APP IS RUNNING ON PORT " + process.env.PORT);
  console.log('APP IS RUNNING ON PORT ' + port);
});
