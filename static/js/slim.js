var input = { from: $("#from"), to: $("#to"), any: $("#from,#to") };
var container = { from: $("#from-container"), to: $("#to-container") };
var list = { from: $("#from-list"), to: $("#to-list"), link: $("#from-list a,#to-list a"), def: $("#default-list") };
var resultHead = { from: $("#result-from"), to: $("#result-to") };
var selected = { from: "", to: "" };
var station = "";
var searchTimer;
var scroller;

$(document).ready(function() {
    scroller = {
        "default": new TouchScroll(document.querySelector("#default-list"), {elastic: true}),
        "from":  new TouchScroll(document.querySelector("#from-list"), {elastic: true}),
        "to": new TouchScroll(document.querySelector("#to-list"), {elastic: true}),
        "result": new TouchScroll(document.querySelector("#result-list"), {elastic: true})
    };
});

input["from"].focus(function() {
    station = "from";
    input[station].attr("value", "");
});

input["to"].focus(function() {
    station = "to";
    input[station].attr("value", "");
});

input["any"].live("keyup", function() {
    list[station].show(function() {
        scroller[station].setupScroller(true);
    });
    var h = $("#header").outerHeight();
    var dh = $(window).height();
    list[station].css("height", (dh - h) + "px");
    list.def.hide();
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
                          var name = data[i].Name.replace(" (Stockholm)", "");
                          html += "<li><a href=\"#\" data-station-id=\"" + data[i].Number + "\">" + name + "</a></li>";
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
    resultHead[station].html(concat(name));
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

$("#close-results").live("click", function(e) {
    e.preventDefault();
    // Reset everything
    selected.from = "";
    selected.to = "";
    list["from"].hide();
    list["to"].hide();
    input["from"].attr("value", "Från");
    input["to"].attr("value", "Till");
    container["to"].hide();
    
    // Show default
    list.def.show();
    $("#result").fadeOut("fast");

    // Reset loaders
    $("#result-list").html("<div class=\"info\">Hämtar information om rutter</div>");
    list["from"].html("<div class=\"info\">Hämtar matchande stationer</div>");
    list["to"].html("<div class=\"info\">Hämtar matchande stationer</div>");
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

function getIcon(type, line) {
  var className = "other";
  var text = "X";
  if (type === "MET") {
    text = "T";
    className = "metro";
    if (line == "17" || line == "18" || line == "19") {
      className += " green";
    } else if (line == "13" || line == "14") {
      className += " red";
    } else if (line == "10" || line == "11") {
      className += " blue";
    }
  } else if (type === "BUS") {
    text = "B";
    className = "bus";
    if (line == "1" || line == "2" || line == "3" || line == "4") {
      className += " urban";
      text = line;
    }
  }
  return "<span class=\"icon " + className + "\"><span>" + text + "</span></span>";
}

function concat(str) {
  var limit = 20;
  if (str.length > limit) {
    str = str.replace(/ \(.*?\)/, "");
    if (str.length > limit) {
      str = str.substr(0, limit) + "…";
    }
  }
  return str;
}

//doSearch();

function doSearch() {
    $("#result").fadeIn("fast", function() {
        var top = $("#result-header").offset().top + $("#result-header").outerHeight();
        var bottom = $("#result-footer").offset().top;
        var height = bottom - top;
        debug(bottom + " - " + top + " = " + height);
        $("#result-list").css("height", height + "px");
        scroller["result"].setupScroller(true);
    });
    var url = "http://slim-app.appspot.com/journey/" + selected.from + "/" + selected.to
    //url = "http://slim-app.appspot.com/journey/9192/1204";
    getJson(url, function(data) {
        data = data.HafasResponse.Trip;
        debug(data);
        var html = "<ul class=\"list\">";
        for (var i = 0, l = data.length; i < l; i++) {
            var dur = data[i].Summary.Duration.split(":");
            var duration = (dur[0] > 0 ? (dur[0] + " h ") : "") + dur[1] + " min";
            var arrival = typeof data[i].Summary.ArrivalTime === "object" ? data[i].Summary.ArrivalTime["#text"] : data[i].Summary.ArrivalTime;
            var departure = typeof data[i].Summary.DepartureTime === "object" ? data[i].Summary.DepartureTime["#text"] : data[i].Summary.DepartureTime;
            
            html += "<li><a href=\"#\">";
            html += "<span class=\"time\"><strong>" + departure + "</strong> &ndash; " + arrival + "</span> <span class=\"duration\">(" + duration + ")</span><br>"
            html += "<span class=\"connections\">" + concat(data[i].Summary.Origin["#text"]) + " &ndash; " + concat(data[i].Summary.Destination["#text"]) + "</span> ";
            if (typeof data[i].SubTrip !== "undefined") {
              if (data[i].SubTrip instanceof Array) {
                for (var s = 0, sl = data[i].SubTrip.length; s < sl; s++) {
                  html += getIcon(data[i].SubTrip[s].Transport.Type, data[i].SubTrip[s].Transport.Line);
                }
              } else {
                  html += getIcon(data[i].SubTrip.Transport.Type, data[i].SubTrip.Transport.Line);
              }
            }
            html += "</a></li>";
        }
        html += "</ul>";
        $("#result-list").html(html);
    });
}

