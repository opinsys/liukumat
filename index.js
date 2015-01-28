"use strict";

var moment = require("moment");
var _ = require("lodash");
var Papa = window.Papa;

var fileInput = document.getElementById("file");
var daysEl = document.getElementById("days");
var flexEl = document.getElementById("flex");
var timeRangeEl = document.getElementById("timerange");

var DAY_LENGHT = 7.5;

// Not trusting Ös here... Good enough!
var OVERTIME_REGEXP = /YLITY/;


fileInput.onchange = handleInputFile;

function handleInputFile() {
    if (!fileInput.files[0]) {
        console.warn("No file");
        return;
    }

    Papa.parse(fileInput.files[0], {
        complete: function(results) {
            // first row is header, skip it
            var days = parseEntriesToDays(results.data.slice(1));

            var startDate = findDate(days, "min");
            var endDate = findDate(days, "max");

            daysEl.innerHTML = Object.keys(days).length;
            flexEl.innerHTML = analyzeFlex(days);

            timeRangeEl.innerHTML = `${startDate.format("DD.MM.YYYY")} - ${endDate.format("DD.MM.YYYY")}`;

        }
    });

}

function parseEntriesToDays(data) {
    var days = {};

    data.forEach(function(hourEntry) {
        var date = hourEntry[0];
        var hours = hourEntry[6];
        var comment = hourEntry[5];

        if (OVERTIME_REGEXP.test(comment)) {
            console.log("Skipataan ylityötunnit");
            console.log(hourEntry);
            return;
        }

        if (hours === undefined) {
            console.warn("Bad hours for", hourEntry);
            return;
        }

        var parsedHours = parseFloat(hours.replace(",", "."), 10);

        var dayObject = days[date] || (days[date] = { hours: 0, entries: [] });
        dayObject.date = moment(date, "DD.MM.YYYY");
        dayObject.entries.push(hourEntry);
        dayObject.hours += parsedHours;
    });


    return days;
}

function findDate(days, method) {
    return _(days).values()[method](function(dateObject) {
        return dateObject.date.toDate();
    }).date;
}

function isWeekend(date) {
    var dayOfWeek = moment(date).format("ddd");
    return dayOfWeek === "Sun" || dayOfWeek === "Sat";
}


function analyzeFlex(days) {
    return _(days).values().reduce(function(currentHours, dayObject) {
        if (isWeekend(dayObject.date)) {
            console.log("Löytyi viikonlopputunteja jotka eivät ole merkitty ylityöksi. Merkitään suoraan plusliukumaksi");
            console.log(dayObject);
            return currentHours + dayObject.hours;
        }

        var extraHours = dayObject.hours - DAY_LENGHT;
        return currentHours + extraHours;
    }, 0);
}

