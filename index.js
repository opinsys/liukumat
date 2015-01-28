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
var HOLIDAY = /ARKIPYH/; // other than sat or sun


fileInput.onchange = handleInputFile;

function handleInputFile() {
    if (!fileInput.files[0]) {
        console.warn("No file");
        return;
    }

    Papa.parse(fileInput.files[0], {
        complete: function(results) {
            renderDataToDOM(results.data);
        }
    });
}

function renderDataToDOM(data) {
    // The row entries should look like this:
    // Date,Client,Project,Project Code,Task,Notes,Hours,Billable?,Invoiced?,Approved?,First Name,Last Name,Department,Employee?
    // 26.01.2015,Tuotekehitys,Viestintä 2014,"",Kehitys,ajax notifkaatio,"7,5",No,No,No,Esa-Matti,Suuronen,"",Yes


    // first row is header, skip it
    var days = parseEntriesToDays(data.slice(1));

    var startDate = findDate(days, "min");
    var endDate = findDate(days, "max");

    daysEl.innerHTML = Object.keys(days).length;
    flexEl.innerHTML = analyzeFlex(days);

    timeRangeEl.innerHTML = `${startDate.format("DD.MM.YYYY")} - ${endDate.format("DD.MM.YYYY")}`;
}


function parseEntriesToDays(data) {
    var days = {};

    data.forEach(function(hourEntry) {
        var date = hourEntry[0];
        var hours = hourEntry[6];
        var comment = hourEntry[5];

        if (hours === undefined) {
            console.warn("Bad bad row", hourEntry);
            return;
        }

        var parsedHours = parseFloat(hours.replace(",", "."), 10);

        if (OVERTIME_REGEXP.test(comment)) {
            console.log(date, "ohitettavia ylityötunteja", parsedHours +"h:", hourEntry);
            return;
        }



        var dayObject = days[date] || (days[date] = {
            hours: 0,
            entries: [],
            holiday: false
        });

        dayObject.date = moment(date, "DD.MM.YYYY");

        if (!dayObject.holiday) {
            // Any of the comments in entries may make this day to a holiday.
            // Do not remove if once set.
            dayObject.holiday = isWeekend(dayObject.date) || HOLIDAY.test(comment);
        }

        dayObject.entries.push(hourEntry);
        dayObject.hours += parsedHours;
    });


    return days;
}

function findDate(days, method) {
    return _(days).values()[method]((dateObject) => dateObject.date.toDate()).date;
}

function isWeekend(date) {
    var dayOfWeek = moment(date).format("ddd");
    return dayOfWeek === "Sun" || dayOfWeek === "Sat";
}


function analyzeFlex(days) {
    return _(days).values().reduce((currentHours, dayObject) => {
        if (dayObject.holiday) {
            console.log(
                moment(dayObject.date).format("DD.MM.YYYY"),
                "Vapaapäivän extra tunteja",
                dayObject.hours, dayObject.entries
            );
            return currentHours + dayObject.hours;
        }

        var extraHours = dayObject.hours - DAY_LENGHT;
        return currentHours + extraHours;
    }, 0);
}

