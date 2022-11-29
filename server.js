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

//Used to store weather forecast for each date
let weatherForecast = {};
//Used to store air quality for each date
let airQualityForecast = {};

//init to no rain
let rainForecasted = "no rain but pack for ";

let packCold = null;
let packWarm = null;
let packHot = null;
let needMask = null;

//passing location in the url
app.get("/weather", async (req, res) => {
    try {
        const {cityName} = req.query

        let lat = null;
        let lon = null;

       await axios("http://api.openweathermap.org/data/2.5/forecast?q="+
            cityName+"&APPID="+process.env.OPEN_WEATHER_KEY +"&units=metric").then(
            async response => {
                let weatherList = response.data.list;

                //retrieving the lat and lon from the response
                lat = response.data.city.coord.lat;
                lon = response.data.city.coord.lon;

                //function to get Temperature, wind speed and rainfall
                getWeatherInfo(weatherList)

                //function to get pm2_5 value
                await getAirPollutionValue(lon, lat)

            }
        );


        //send back weather info
      res.status(200).json({ weatherForecast: weatherForecast,
          rainForecasted: rainForecasted,
          packCold: packCold,
          packHot: packHot,
          packWarm: packWarm,
          airQualityForecast: airQualityForecast,
          needMask: needMask,
      });


      //init for next search
      weatherForecast = {};
      airQualityForecast = {};
      rainForecasted = "NO RAIN but pack for ";
      packCold = null;
      packWarm = null;
      packHot = null;
      needMask = null;


    } catch (err) {
        res.status(500).json({ message: err });
    }
});


// extra feature
app.get('/translation', async (req, res) => {

    //the text to be translated
    const {text} = req.query
    const encodedParams = new URLSearchParams();

    encodedParams.append("q",text.toString());
    encodedParams.append("target", "es");
    encodedParams.append("source", "en");

    const options = {
        method: 'POST',
        url: 'https://google-translate1.p.rapidapi.com/language/translate/v2',
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'Accept-Encoding': 'application/gzip',
            'X-RapidAPI-Key': process.env.RAPID_API_KEY,
            'X-RapidAPI-Host': process.env.RAPID_API_HOST
        },
        data: encodedParams
    };

    axios.request(options).then(function (response) {

        res.status(200).json({
            spanish: response.data.data
        })
    }).catch(function (error) {
        console.error(error);
    });
})

app.listen(port, () => console.log(`Listening on port ${port}!`));

async function getAirPollutionValue(lon, lat) {

    await axios("http://api.openweathermap.org/data/2.5/air_pollution/" +
        "forecast?lat=" + lat + "&lon=" + lon + "&appid=" + process.env.OPEN_WEATHER_KEY).then(
        response => {
            let airQualityList = response.data.list
            for (airQ in airQualityList) {

                //get pretty date
                let date = new Date(airQualityList[airQ].dt * 1000);
                // set hours to 0 to be able to group the dates
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
                    needMask = "and BRING A MASK as air quality is poor :( "
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
            rainForecasted = "Unfortunately rain is forecasted so BRING AN UMBRELLA and pack for ";
            weatherForecast[date].rainForecasted = rainForecasted;
            weatherForecast[date].rainFallLevel.push(weatherList[weatherIndex].rain['3h'])
            weatherForecast[date].rainFallLevelAverage = (weatherForecast[date].rainFallLevel).reduce((partialSum, a) => partialSum + a, 0)
        }else{
            weatherForecast[date].rainFallLevelAverage = 0
        }
        if((weatherForecast[date].temperatures).some(a => a<12) ){
            packCold = "COLD weather ";
        }else if ((weatherForecast[date].temperatures).some(a => a>12 && a<24) ){
            packWarm = "WARM weather ";
        }else if((weatherForecast[date].temperatures).some(a => a>24)){
            packHot = "HOT weather ";
        }
    }

}

function getAverage(array){
    return (array.reduce((partialSum, a) => partialSum + a, 0))
        /(array.length)
}
