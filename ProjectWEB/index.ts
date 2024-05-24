import express, { Express } from "express";
import dotenv from "dotenv";
import path from "path";
dotenv.config();
const app : Express = express();
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("views", path.join(__dirname, "views"));
app.set("port", process.env.PORT ?? 3000);

app.get("/", (req, res) => {
    res.render("index", {
        title: "Hello World",
        message: "Hello World"
    })
});

import { Car } from '../interface';
import fs from 'fs';
app.get('/cars', (req, res) => {
    fs.readFile('./data.json', 'utf8', (err: any, data: any) => {
      if (err) {
        console.error(err);
        res.status(500).send('Error loading data');
        return;
      }
      const jsonData = JSON.parse(data);
      res.render('cars', { data: jsonData });
    });
});
app.get('/details/:name', (req, res) => {
    const items = JSON.parse(fs.readFileSync('data.json').toString());
    const item: Car | undefined = items.find((item: Car) => item.name === req.params.name);
    if (item) {
        res.render('details', { item });
    } else {
        console.log('Car not found'); // Debug log
        res.status(404).send('Car not found');
    }
});
app.post('/cars', (req, res) => {
    const selectedColumns = req.body.columns || [];
    fs.readFile(path.join(__dirname, 'data.json'), 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error loading data');
            return;
        }
        const jsonData = JSON.parse(data);
        res.render('cars', { data: jsonData, columns: selectedColumns });
    });
});


app.listen(app.get("port"), () => {
    console.log("Server started on http://localhost:" + app.get("port"));
});