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
        let packCold = false;
        let packWarm = false;
        let packHot = false;

        await axios("http://api.openweathermap.org/data/2.5/forecast?q="+
            cityName+"&APPID="+process.env.OPEN_WEATHER_KEY +"&units=metric").then(
            response => {
                    let weatherList = response.data.list;
                    for (weatherIndex in weatherList) {
                        let date = new Date(response.data.list[weatherIndex].dt * 1000);
                        date.setHours(0, 0, 0, 0);
                      //date = date.toLocaleDateString();

                        if (!weatherForecast[date]) {
                            weatherForecast[date] = {
                                temperatures: [],
                                temperatureAverage: null,
                                windSpeeds: [],
                                windSpeedsAverage: null,
                                rainFallLevel: [],
                                rainFallLevelAverage: null,

                            }
                        }

                        weatherForecast[date].temperatures.push(weatherList[weatherIndex].main.temp);
                        //computing the average temp
                        weatherForecast[date].temperatureAverage = getAverage(weatherForecast[date].temperatures)

                        weatherForecast[date].windSpeeds.push(weatherList[weatherIndex].wind.speed)
                        weatherForecast[date].windSpeedsAverage = getAverage(weatherForecast[date].windSpeeds)

                        if (weatherList[weatherIndex].rain && weatherList[weatherIndex].rain['3h']) {
                            rainForecasted = "unfortunately it's raining over the next 4 day, BRING AN UMBRELLA ";
                            weatherForecast[date].rainForecasted = rainForecasted;
                            weatherForecast[date].rainFallLevel.push(weatherList[weatherIndex].rain['3h'])
                            weatherForecast[date].rainFallLevelAverage = (weatherForecast[date].rainFallLevel).reduce((partialSum, a) => partialSum + a, 0)
                        }
                        if((weatherForecast[date].temperatures).some(a => a<12) ){
                            packCold = true;
                        }else if ((weatherForecast[date].temperatures).some(a => a>12 && a<24) ){
                            packWarm = true;
                        }else if((weatherForecast[date].temperatures).some(a => a>24)){
                            packHot = true;
                        }
                    }
                }
        );

      res.status(200).json({ weatherForecast: weatherForecast,
          rainForecasted: rainForecasted,
          packCold: packCold,
          packHot: packHot,
          packWarm: packWarm
      });

    } catch (err) {
        res.status(500).json({ message: err });
    }
});

app.listen(port, () => console.log(`Listening on port ${port}!`));

function getAverage(array){
    return (array.reduce((partialSum, a) => partialSum + a, 0))
        /(array.length)
}
