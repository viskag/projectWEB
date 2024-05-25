import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { Car } from "./interface";
import * as db from "./db/database";
dotenv.config();
const app: Express = express();
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("views", path.join(__dirname, "views"));
app.set("port", process.env.PORT ?? 3000);
app.get("/", async (req: Request, res: Response) => {
    res.render("index", {
        title: "Homepage",
        message: "Test123"
    });
});

app.get('/cars', async (req: Request, res: Response) => {
    fs.readFile(path.join(__dirname, 'data.json'), 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error loading data');
            return;
        }
        let jsonData: Car[] = JSON.parse(data);

        // Extract sortBy and sortOrder from query parameters or default to 'id' and 'ascending'
        let sortBy: string = typeof req.query.sortBy === 'string' ? req.query.sortBy : 'id';
        let sortOrder: string = typeof req.query.sortOrder === 'string' ? req.query.sortOrder : 'ascending';

        // Toggle sortOrder if the same column header is clicked again
        if (sortBy === req.query.prevSortBy) {
            sortOrder = sortOrder === 'ascending' ? 'descending' : 'ascending';
        }

        // Store the current sortBy value in query parameters for future toggling
        const prevSortBy = sortBy;

        // Sort jsonData based on sortBy property and sortOrder
        jsonData.sort((a, b) => {
            if (sortOrder === 'ascending') {
                if (a[sortBy] < b[sortBy]) return -1;
                if (a[sortBy] > b[sortBy]) return 1;
            } else {
                if (a[sortBy] > b[sortBy]) return -1;
                if (a[sortBy] < b[sortBy]) return 1;
            }
            return 0;
        });

        // Extract selected columns from query string or use default if not provided
        let selectedColumns: string[] | undefined = undefined;
        if (typeof req.query.columns === 'string') {
            selectedColumns = [req.query.columns];
        } else if (Array.isArray(req.query.columns)) {
            selectedColumns = req.query.columns.map(col => String(col));
        }

        // If selected columns are empty, default to ['id', 'name', 'founded']
        if (!selectedColumns || selectedColumns.length === 0) {
            selectedColumns = ['id', 'logo', 'name', 'founded'];
        }

        // Apply search filter
        if (req.query.search && typeof req.query.search === 'string') {
            const searchQuery = req.query.search.toLowerCase();
            jsonData = jsonData.filter(item => {
                for (const column of selectedColumns) {
                    // Use type assertion to tell TypeScript that item[column] is a string
                    if ((item as any)[column].toString().toLowerCase().includes(searchQuery)) {
                        return true;
                    }
                }
                return false;
            });
        }

        // If search results are empty, retain the selected columns
        if (jsonData.length === 0) {
            jsonData = JSON.parse(data);
        }

        // Pass selected columns and search query to the template
        res.render('cars', { data: jsonData, columns: selectedColumns, search: req.query.search , sortBy, sortOrder, prevSortBy});
    });
});

app.post('/cars', async (req: Request, res: Response) => {
    const selectedColumns = req.body.columns || ['id', 'logo', 'name', 'founded'];
    fs.readFile(path.join(__dirname, 'data.json'), 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error loading data');
            return;
        }
        const jsonData: Car[] = JSON.parse(data);
        res.render('cars', { data: jsonData, columns: selectedColumns, sortBy: req.query.sortBy, sortOrder: req.query.sortOrder, prevSortBy: req.query.prevSortBy });
    });
});

app.get('/details/:name', (req: Request, res: Response) => {
    const items: Car[] = JSON.parse(fs.readFileSync(path.join(__dirname, 'data.json'), 'utf8'));
    const item: Car | undefined = items.find((item: Car) => item.name === req.params.name);
    if (item) {
        res.render('details', { item });
    } else {
        res.status(404).send('Car not found');
    }
});

// Route to display details about a country
app.get('/country/:name', async (req: Request, res: Response) => {
    const cName: string = req.params.name;
    try {

        // Fetch country details from the API
        const response = await fetch(`https://api.api-ninjas.com/v1/country?name=${cName.toLowerCase()}`, {
            headers: {
              'X-Api-Key': 'Be0SlkkgzngczUhPkJW/WQ==VkpQ1vsazkZGV80R'
            }});
        if (!response.ok) {
            throw new Error('Failed to fetch country details');
        }
        const cData = await response.json();

        // Render the template with the country data
        res.render('country', { country: cData});
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching country details');
    }
});

app.get("/db", async (req, res) => {
    const carsDB = db.carCollection;
    const cars = await carsDB.find({}).toArray();
    res.type("application/json")
    res.json(cars);
})

app.listen(app.get("port"), async () => {
    await db.connect();;
    //await db.seed();
    console.log("Server started on http://localhost:" + app.get("port"));
});