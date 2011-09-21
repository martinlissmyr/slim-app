var input = { from: $("#from"), to: $("#to"), any: $("#from,#to") };
var container = { from: $("#from-container"), to: $("#to-container") }
var list = { from: $("#from-list"), to: $("#to-list"), link: $("#from-list a,#to-list a") }
var resultHead = { from: $("#result-from"), to: $("#result-to") }
var selected = { from: "", to: "" };
var station = "";
var searchTimer;

input["from"].focus(function() {
    station = "from";
    input[station].attr("value", "");
});

input["to"].focus(function() {
    station = "to";
    input[station].attr("value", "");
});

input["any"].live("keyup", function() {
    list[station].show();
    var val = $(this).attr("value");
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function() {
        if (val.length > 1) {
            var url = "http://slim-app.appspot.com/station/" + val;
            getJson(url, function(data) {
                data = data.Hafas.Sites.Site instanceof Array ? data.Hafas.Sites.Site : [data.Hafas.Sites.Site];
                var html = "<ul class=\"list\">";
                for (var i = 0, l = data.length; i < l; i++) {
                    if (typeof data[i].Name != "undefined") {
                        if (!data[i].Name.match(/([A-Z]|[ÅÄÖ]){2,}/)) {
                            html += "<li><a href=\"#\" data-station-id=\"" + data[i].Number + "\">" + data[i].Name + "</a></li>";
                        }
                    }
                }
                html += "</ul>";
                list[station].html(html);
            });
        }
    }, 500);
});

list["link"].live("click", function() {
    selected[station] = $(this).attr("data-station-id");
    var name = $(this).html();
    resultHead[station].html(name);
    input[station].attr("value", name);
    list[station].hide();

    if (station === "from") {
        container["to"].show();
        input["to"].focus();
    } else if (station === "to") {
        doSearch()
    }

    return false;
});

function debug(str) {
    if (typeof console != "undefined") { console.log(str); }
}

function getJson(url, callback) {
    $.ajax({
        url: url,
        dataType: "jsonp",
        cache: true,
        jsonpCallback: "slim",
        crossDomain: true,
        success: function(data) {
            debug("Got data from " + url);
            if(typeof callback != "undefined") {
                callback.call(this, data);
            }
        }
    });
}

//doSearch();

function doSearch() {
    $("#result").fadeIn("fast");
    var url = "http://slim-app.appspot.com/journey/" + selected.from + "/" + selected.to
    //url = "http://slim-app.appspot.com/journey/9192/9309";
    getJson(url, function(data) {
        data = data.HafasResponse.Trip;
        debug(data);
        var html = "<ul class=\"list\">";
        for (var i = 0, l = data.length; i < l; i++) {
            var dur = data[i].Summary.Duration.split(":");
            var duration = (dur[0] > 0 ? (dur[0] + " h ") : "") + dur[1] + " min";
            var arrival = typeof data[i].Summary.ArrivalTime === "object" ? data[i].Summary.ArrivalTime["#text"] : data[i].Summary.ArrivalTime;
            var departure = typeof data[i].Summary.DepartureTime === "object" ? data[i].Summary.DepartureTime["#text"] : data[i].Summary.DepartureTime;
            
            html += "<li>";
            html += "<a href=\"#\"><span class=\"time\"><strong>" + departure + "</strong> &ndash; " + arrival + "</span> <span class=\"duration\">(" + duration + ")</span><br>"
            html += "<span class=\"connections\">" + data[i].Summary.Origin["#text"] + " &ndash; " + data[i].Summary.Destination["#text"] + "</span></a>";
            html += "</li>";
        }
        html += "</ul>";
        $("#result-list").html(html);
    });
}