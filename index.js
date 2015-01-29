"use strict";

var moment = require("moment");
var _ = require("lodash");
var Papa = window.Papa;

var fileInput = document.getElementById("file");
var flexDaysInput = document.getElementById("flexdays");
var startHoursInput = document.getElementById("starthours");
var res = document.getElementById("res");

flexDaysInput.value = localStorage.flexDays || "";
startHoursInput.value = localStorage.startHours || "";

var DAY_LENGTH = 7.5;

// Not trusting Ös here... Good enough!
var COMMENT_FLAGS = {
    OVERTIME: /YLITY/,
    HOLIDAY: /ARKIPYH/ // other than sat or sun
};


fileInput.onchange = onChange;
flexDaysInput.onkeyup = onChange;
startHoursInput.onkeyup = onChange;

function onChange() {
    var flexDays = parseInt(flexDaysInput.value, 10) || 0;
    localStorage.flexDays = flexDaysInput.value;
    localStorage.startHours = startHoursInput.value;
    var startHours = parseCommaFloat(startHoursInput.value);

    if (!fileInput.files[0]) {
        console.warn("No file");
        return;
    }

    Papa.parse(fileInput.files[0], {
        complete: function(results) {
            renderDataToDOM(results.data, flexDays, startHours);
        }
    });
}

function renderDataToDOM(data, flexDays, startHours) {
    // The row entries should look like this:
    // Date,Client,Project,Project Code,Task,Notes,Hours,Billable?,Invoiced?,Approved?,First Name,Last Name,Department,Employee?
    // 26.01.2015,Tuotekehitys,Viestintä 2014,"",Kehitys,ajax notifkaatio,"7,5",No,No,No,Esa-Matti,Suuronen,"",Yes


    // first row is header, skip it
    var users = parseEntriesToDays(data.slice(1));

    var results = "";

    _.forEach(users, function(days, name) {
        var startDate = findDate(days, "min");
        var endDate = findDate(days, "max");

        var flexHours = startHours;
        flexHours += analyzeFlex(days);
        flexHours -= flexDays * DAY_LENGTH;

        results += `
            ${name}
            Aikaväli ${startDate.format("DD.MM.YYYY")} - ${endDate.format("DD.MM.YYYY")}
            Työpäivä ${Object.keys(days).length}
            Kertyneitä liukumatunteja ${flexHours}

        `;

    });


    res.innerHTML= results;
}


function parseEntriesToDays(data) {
    var users = {};

    data.forEach(function(hourEntry) {
        var date = hourEntry[0];
        var hours = hourEntry[6];
        var comment = hourEntry[5];

        if (hours === undefined) {
            console.warn("Bad bad row", hourEntry);
            return;
        }

        var firstName = hourEntry[10];
        var lastName = hourEntry[11];
        var userKey = firstName + " " + lastName;

        var days = users[userKey] || (users[userKey] = {});



        var parsedHours = parseCommaFloat(hours);

        if (COMMENT_FLAGS.OVERTIME.test(comment)) {
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
            dayObject.holiday = isWeekend(dayObject.date) || COMMENT_FLAGS.HOLIDAY.test(comment);
        }

        dayObject.entries.push(hourEntry);
        dayObject.hours += parsedHours;
    });


    return users;
}

function findDate(days, method) {
    return _(days).values()[method]((dateObject) => dateObject.date.toDate()).date;
}

function isWeekend(date) {
    var dayOfWeek = moment(date).format("ddd");
    return dayOfWeek === "Sun" || dayOfWeek === "Sat";
}

function parseCommaFloat(numStr) {
    return parseFloat(numStr.replace(",", "."), 10) || 0;
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

        if (!dayObject.hours) {
            console.error("EI tunteja päivälle " + moment(dayObject.date).format("DD.MM.YYYY"));
        }

        return currentHours + dayObject.hours - DAY_LENGTH;
    }, 0);
}

