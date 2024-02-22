import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import env from "dotenv"

const app = express();
const port = 3000;

env.config()

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: process.env.password,
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1; //start from first tap before tapping

let users = [
  { id: 1, name: "Angela", color: "teal"}, //must match the currentUserId to associate with current user
  { id: 1, name: "Jack", color: "powderblue"},
] //can be [] but for visualizing it structure

async function checkVisited() {
  const result = await db.query(
    "SELECT country_code FROM visited_countries JOIN users ON users.id = user_id WHERE user_id = $1;",
    [currentUserId]
  );

  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}

async function getCurrentUser() {
  const result = await db.query("SELECT * FROM users");
  users = result.rows; //put all info in the users [{}]array dictionary
  return users.find((user) => user.id == currentUserId); //use find instead of for loop //for 3 equal sign value and data type also must match
}

//2. Get home page
app.get("/", async (req, res) => {
  const countries = await checkVisited();
  const currentUser = await getCurrentUser();

  res.render("index.ejs", { 
    countries: countries, 
    total: countries.length,
    users: users,
    color: currentUser.color,
  });
});

//1. INSERT new country in pg
app.post("/add", async (req, res) => {
  const input = req.body['country'];
  const currentUser = await getCurrentUser();

  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );
    
    const data = result.rows[0];
    const countryCode = data.country_code;

    try {
      await db.query(
        "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)",
        [countryCode, currentUserId]
      );
      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
      console.log(err);
  }
});

app.post("/user", async (req, res) => {
  if (req.body.add === "new") {
    res.render("new.ejs");
  } else {
    currentUserId = req.body.user;
    res.redirect("/");
  }
}); //input name add in index.ejs

app.post("/new", async (req, res) => {
  const name = req.body.name; //user put name to add in inpur field
  const color = req.body.color;

  const result = await db.query(
    "INSERT INTO users (name, color) VALUES($1, $2) RETURNING *;",
    [name, color]
  ); //add name and color in pg

  const id = result.rows[0].id;
  currentUserId = id;

  res.redirect("/"); //to get latest info about the currentUser
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});