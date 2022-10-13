require('dotenv').config()
const express = require("express");
var cors = require('cors')
var app = express()
app.use(cors())
app.use(express.json())
const axios = require("axios")

const port = 3000;

const path = require('path');

let publicPath = path.resolve(__dirname, "public");

app.use(express.static(publicPath));
app.use(cors());

app.get('/', (req, res) => {
    res.send('Hello World!')
});

//passing location
app.get("/async/:location", async (req, res) => {
    try {
        const cityName = req.params.location
        let response = await axios("http://api.openweathermap.org/data/2.5/forecast?q="+ cityName+"&APPID="+process.env.OPEN_WEATHER_KEY );

        res.status(200).send(response.data.list);
    } catch (err) {
        res.status(500).json({ message: err });
    }
});

app.listen(port, () => console.log(`Listening on port ${port}!`));
