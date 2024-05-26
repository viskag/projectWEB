import express, { Express, NextFunction, Request, Response } from "express";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { Car } from "./interface";
import * as db from "./db/database";
import { ToArray } from "yargs";
import session from 'express-session';
import authRoutes from './auth';
dotenv.config();
const app: Express = express();
declare module 'express-session' {
    interface Session {
      username: string;
    }
  }
app.use(session({
    secret: process.env.SESSION_SECRET || 'your_secret_key',
    resave: false,
    saveUninitialized: true,
  }));
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("views", path.join(__dirname, "views"));
app.set("port", process.env.PORT ?? 3000);
app.get("/", async (req: Request, res: Response) => {
    res.render("index", {
        title: "Homepage",
        message: "Klik op *Mijn JSON* om de 'raw' data te zien.",
        username: req.session.username
    });
});

app.get('/cars',requireLogin, async (req: Request, res: Response) => {
    try {
        const carsDB = db.carCollection;

        // Extract sortBy and sortOrder from query parameters or default to 'id' and 'ascending'
        let sortBy: string = typeof req.query.sortBy === 'string' ? req.query.sortBy : 'id';
        let sortOrder: string = typeof req.query.sortOrder === 'string' ? req.query.sortOrder : 'ascending';

        // Toggle sortOrder if the same column header is clicked again
        if (sortBy === req.query.prevSortBy) {
            sortOrder = sortOrder === 'ascending' ? 'descending' : 'ascending';
        }

        // Store the current sortBy value in query parameters for future toggling
        const prevSortBy = sortBy;

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
        let query: any = {};
        if (req.query.search && typeof req.query.search === 'string') {
            const searchQuery = req.query.search.toLowerCase();
            query = {
                $or: selectedColumns.map(column => ({
                    [column]: { $regex: searchQuery, $options: 'i' }
                }))
            };
        }

        // Get data from MongoDB
        let jsonData: Car[] = await carsDB.find(query).toArray();

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

        // Pass selected columns and search query to the template
        res.render('cars', { data: jsonData, columns: selectedColumns, search: req.query.search, sortBy, sortOrder, prevSortBy, username: req.session.username });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error loading data');
    }
});

app.post('/cars', requireLogin, async (req: Request, res: Response) => {
    try {
        const carsDB = db.carCollection;
        let selectedColumns = ['id', 'name'];

        // Ensure 'id' and 'logo' are always included at the beginning if 'logo' is selected
        if (req.body.columns != undefined && Array.isArray(req.body.columns)) {
            if (req.body.columns.includes('logo')) {
                selectedColumns = ['id', 'logo', 'name'];
            }
            req.body.columns.forEach((el: string) => {
                if (el !== 'logo') {
                    selectedColumns.push(el);
                }
            });
        } else if (req.body.columns != undefined && typeof req.body.columns === 'string') {
            if (req.body.columns === 'logo') {
                selectedColumns = ['id', 'logo', 'name'];
            } else {
                selectedColumns.push(req.body.columns);
            }
        }

        // Get data from database
        const jsonData: Car[] = await carsDB.find({}).toArray();

        // Render the template with the fetched data
        res.render('cars', { data: jsonData, columns: selectedColumns, sortBy: req.query.sortBy, sortOrder: req.query.sortOrder, prevSortBy: req.query.prevSortBy,username: req.session.username });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error loading data');
    }
});

app.get('/details/:name', requireLogin, async (req: Request, res: Response) => {
    try {
        const carsDB = db.carCollection;
        const item: Car | null = await carsDB.findOne({ name: req.params.name });
        if (item) {
            res.render('details', { item,username: req.session.username });
        } else {
            res.status(404).send('Car not found');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Error loading data');
    }
});

// Route to display details about a country
app.get('/country/:name', requireLogin, async (req: Request, res: Response) => {
    const cName: string = req.params.name;
    try {

        const apikey = 'Be0SlkkgzngczUhPkJW/WQ==VkpQ1vsazkZGV80R';
        if (!apikey) {
            console.error('API key is not defined');
            return res.status(500).send('API key is not defined');
        }

        // Fetch country details from the API
        const response = await fetch(`https://api.api-ninjas.com/v1/country?name=${cName.toLowerCase()}`, {
            headers: {
                'X-Api-Key': apikey
            }
        });
        if (!response.ok) {
            throw new Error('Failed to fetch country details');
        }
        const cData = await response.json();

        // Render the template with the country data
        res.render('country', { country: cData ,username: req.session.username});
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching country details');
    }
});

// Route to display edit form
app.get('/edit/:id',requireAdmin,requireLogin, async (req: Request, res: Response) => {
    try {
        const carsDB = db.carCollection;
        const car: Car | null = await carsDB.findOne({ id: parseInt(req.params.id) });
        if (car) {
            res.render('edit', { car,username: req.session.username });
        } else {
            res.status(404).send('Car not found');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Error loading data');
    }
});

// Route to handle edit form submission
app.post('/edit/:id', requireAdmin, requireLogin, async (req: Request, res: Response) => {
    try {
        const carsDB = db.carCollection;
        const updatedCar: Partial<Car> = {
            name: req.body.name,
            founded: req.body.founded,
            tags: req.body.tags ? req.body.tags.split(',').map((tag: string) => tag.trim()) : [], // Process tags
            status: req.body.status, // Process status
            // Add other fields as needed
        };
        const result = await carsDB.updateOne({ id: parseInt(req.params.id) }, { $set: updatedCar });
        if (result.modifiedCount > 0) {
            res.redirect('/cars');
        } else {
            res.status(404).send('Car not found or no changes made');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Error updating data');
    }
});

app.get("/db", async (req, res) => {
    const carsDB = db.carCollection;
    const cars = await carsDB.find({}).toArray();
    res.type("application/json")
    res.json(cars);
})



// Middleware to check if the user is admin
function requireAdmin(req: Request, res: Response, next: NextFunction) {
    // Check if the user is authenticated and their username is "admin"
    if (req.session.username === 'admin') {
        // User is admin, allow access to the next middleware or route handler
        next();
    } else {
        // User is not admin, redirect to another page or render an error message
        res.status(403).send('Enkel ADMINS mogen bewerking doorvoeren');
    }
}
// Middleware to check if the user is logged in
function requireLogin(req: Request, res: Response, next: NextFunction) {
    // Check if the user is authenticated
    if (req.session.username) {
        // User is logged in, allow access to the next middleware or route handler
        next();
    } else {
        // User is not logged in, redirect to the login page
        res.redirect('/login');
    }
}
// Middleware to check if the user is already logged in
function redirectToDashboardIfLoggedIn(req: Request, res: Response, next: NextFunction) {
    // Check if the user is authenticated
    if (req.session.username) {
        // User is already logged in, redirect to the dashboard or another page
        res.redirect('/dashboard');
    } else {
        // User is not logged in, proceed to the next middleware
        next();
    }
}
app.get('/login', redirectToDashboardIfLoggedIn, (req, res) => {
    res.render('login', {username: req.session.username });
  });
  app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    console.log('Received username:', username);
    console.log('Received password:', password);
    const isValidUser = await db.verifyUser(username, password);
    console.log('Is user valid?', isValidUser);
    if (isValidUser) {
      req.session.username = username;
      res.redirect('/dashboard');
    } else {
        console.log('Invalid login attempt');
      res.redirect('/login');
    }
  });
  app.get('/register', redirectToDashboardIfLoggedIn, (req, res) => {
    res.render('register', {username: req.session.username});
  });
  app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const userExists = await db.findUserByUsername(username);
    if (userExists) {
      res.redirect('/register');
    } else {
      await db.addUser({ id: Date.now(), username: username, password: password });
      res.redirect('/login');
    }
  });
  app.get('/dashboard', requireLogin, (req, res) => {
    if (req.session.username) {
      //res.send(`Welcome ${req.session.username}`);
      res.render('dashboard', {username: req.session.username});
    } else {
      res.redirect('/login');
    }
  });
  // Logout route
app.get('/logout', (req: Request, res: Response) => {
    // Clear the session
    req.session.destroy((err: any) => {
      if (err) {
        console.error('Error destroying session:', err);
      } else {
        console.log('User logged out');
        res.redirect('/login');
      }
    });
  });







  const flagsData = require('./flags.json');
  // Route handler for /countries
  app.get('/countries', requireLogin, async (req: Request, res: Response) => {
      try {
        const first20Countries = flagsData.slice(0, 20);
          // Render a view to display the country information
          res.render('countries', { countries: first20Countries, username: req.session.username});
      } catch (error) {
          console.error(error);
          res.status(500).send('Error fetching country data. Please try again later.');
      }
  });
app.listen(app.get("port"), async () => {
    await db.connect();;
    //await db.seed();
    console.log("Server started on http://localhost:" + app.get("port"));
});