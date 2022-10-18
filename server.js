require('dotenv').config()
const express = require("express");
var cors = require('cors')
var app = express()
app.use(cors())
app.use(express.json())
const axios = require("axios")

const port = 3000;

const path = require('path');
const {response, query} = require("express");

let publicPath = path.resolve(__dirname, "public");
//hash map to store weather forecast for each date
let weatherForecast = {};
let airQualityForecast = {};

let rainForecasted = "no rain this weekend wahoo!";
let packCold = null;
let packWarm = null;
let packHot = null;
let needMask = null;

app.use(express.static(publicPath));
app.use(cors());

app.get('/', (req, res) => {
    res.send('Hello World!')
});

//passing location
app.get("/:location", async (req, res) => {
    try {
        const cityName = req.params.location

        let lat = null;
        let lon = null;

        await axios("http://api.openweathermap.org/data/2.5/forecast?q="+
            cityName+"&APPID="+process.env.OPEN_WEATHER_KEY +"&units=metric").then(
            async response => {
                let weatherList = response.data.list;
                lat = response.data.city.coord.lat;
                lon = response.data.city.coord.lon;

                //function to get Temperature, wind speed and rainfall
                getWeatherInfo(weatherList)

                //function to get pm2_5 value
                await getAirPollutionValue(lon, lat)

            }
        );



      res.status(200).json({ weatherForecast: weatherForecast,
          rainForecasted: rainForecasted,
          packCold: packCold,
          packHot: packHot,
          packWarm: packWarm,
          airQualityForecast: airQualityForecast,
          needMask: needMask

      });


      weatherForecast = {};
      airQualityForecast = {};

      rainForecasted = "no rain this weekend wahoo!";
      packCold = null;
      packWarm = null;
      packHot = null;
      needMask = null;


    } catch (err) {
        res.status(500).json({ message: err });
    }
});

app.listen(port, () => console.log(`Listening on port ${port}!`));

async function getAirPollutionValue(lon, lat) {
    await axios("http://api.openweathermap.org/data/2.5/air_pollution/" +
        "forecast?lat=" + lat + "&lon=" + lon + "&appid=" + process.env.OPEN_WEATHER_KEY).then(
        response => {
            let airQualityList = response.data.list
            for (airQ in airQualityList) {
                let date = new Date(airQualityList[airQ].dt * 1000);
                date.setHours(0, 0, 0, 0);
                date = date.toLocaleDateString();

                if (!airQualityForecast[date]) {
                    airQualityForecast[date] = {
                        pm2_5: [],
                        pm2_5Average: null,
                    }
                }

                airQualityForecast[date].pm2_5.push(airQualityList[airQ].components.pm2_5);
                if((airQualityForecast[date].pm2_5).some(a => a > 10)){
                    needMask = "bring a mask"
                }
            }

        })


    }

function getWeatherInfo(weatherList){

    for (weatherIndex in weatherList) {
        let date = new Date(weatherList[weatherIndex].dt * 1000);
        date.setHours(0, 0, 0, 0);
        date = date.toLocaleDateString();


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
            packCold = "pack for COLD weather";
        }else if ((weatherForecast[date].temperatures).some(a => a>12 && a<24) ){
            packWarm = "pack for WARM weather";
        }else if((weatherForecast[date].temperatures).some(a => a>24)){
            packHot = "pack for HOT weather";
        }
    }

}

function getAverage(array){
    return (array.reduce((partialSum, a) => partialSum + a, 0))
        /(array.length)
}
