import express from 'express';
import 'dotenv/config';

const app = express();

const port = process.env.PORT || 3999;

const recipeRoutes = require("./routes/recipes");

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(express.static(__dirname +'/public'));
app.use(express.static(__dirname + '/views'));

app.get('/', function(req, res){
    res.sendFile(path.join(__dirname, '/index.html'));
});

app.use('/api/recipes', recipeRoutes);

app.listen(port, function(){
    //console.log("APP IS RUNNING ON PORT " + process.env.PORT);
    console.log("APP IS RUNNING ON PORT " + port);
})
