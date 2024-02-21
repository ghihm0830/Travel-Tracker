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

async function checkVisited() {
  const result = await db.query("SELECT country_code FROM visited_countries");

  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}

//2. Get home page
app.get("/", async (req, res) => {
  const countries = await checkVisited();
  res.render("index.ejs", { countries: countries, total: countries.length });
});

//1. INSERT new country in pg
app.post("/add", async (req, res) => {
  const input = req.body["country"];
  // user types in input field

//Catch error -> try
  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
      //make query from pg with the input to find correcponding country code and store in "result"
      //$1 = user's input
    );

    const data = result.rows[0];
    const countryCode = data.country_code;
    
    try {
      await db.query("INSERT INTO visited_countries (country_code) VALUES ($1)",
      [countryCode]); //value $1 will be replaced by the countryCode
      res.redirect("/");
      //go bock to the home page
    } catch (err) {
      console.log(err);
      const countries = await checkVisited();
      //checkvisited() grab all countries alraedy visited
      res.render("index.ejs", {
        countries: countries,
        total: countries.length,
        error: "Country has already been added, try again!",
      });
    }
  } catch (err) {
    console.log(err);
    const countries = await checkVisited();
    res.render("index.ejs", {
      countries: countries,
      total: countries.length,
      error: "Country name does not exist, try again!"
    })
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
``