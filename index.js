import express from 'express';
import cors from 'cors';
import router from './routes/routes-recipe.js';
import 'dotenv/config';
import cors from 'cors';

const app = express();

const port = process.env.PORT || 3999;

app.use(cors())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.json())

app.use('/api/v1/recipe', router);

app.get('/', function (req, res) {
  res.send('this is root route');
});


app.listen(port, function () {
  //console.log("APP IS RUNNING ON PORT " + process.env.PORT);
  console.log('APP IS RUNNING ON PORT ' + port);
});
