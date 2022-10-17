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
        //hash map to store weather forecast for each date
        let weatherForecast = {};
        let rainForecasted = "no rain this weekend wahoo!";
        let response = await axios("http://api.openweathermap.org/data/2.5/forecast?q="+
            cityName+"&APPID="+process.env.OPEN_WEATHER_KEY ).then(
            response => {
                    let weatherList = response.data.list;
                    for (index in weatherList) {
                        let date = new Date(response.data.list[index].dt * 1000);
                        date.setHours(0, 0, 0, 0);
                      //date = date.toLocaleDateString();

                        if (!weatherForecast[date]) {
                            weatherForecast[date] = {
                                temperatures: [],
                                rainForecasted: rainForecasted
                            }
                        }

                        weatherForecast[date].temperatures.push(weatherList[index].main.temp);

                        if (weatherList[index].rain) {
                            rainForecasted = "unfortunately it's raining over the next 4 day, BRING AN UMBRELLA ";
                            weatherForecast[date].rainForecasted = rainForecasted;
                        }
                    }
                }
        );

      res.status(200).json({ weatherForecast: weatherForecast} );

    } catch (err) {
        res.status(500).json({ message: err });
    }
});

app.listen(port, () => console.log(`Listening on port ${port}!`));
