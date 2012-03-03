Storage.prototype.setObject = function(key, value) { this.setItem(key, JSON.stringify(value)); }
Storage.prototype.getObject = function(key) { return this.getItem(key) && JSON.parse(this.getItem(key)); }
var input = { from: $("#from"), to: $("#to"), any: $("#from,#to") };
var container = { from: $("#from-container"), to: $("#to-container") };
var list = { from: $("#from-list"), to: $("#to-list"), link: $("#from-list a,#to-list a"), def: $("#default-list"), result: $("#result-list") };
var resultHead = { from: $("#result-from"), to: $("#result-to") };
var selected = { from: { id: null, name: "" }, to: { id: null, name: "" } };
var station = "";
var searchTimer;
var storage = { 
    recent: { 
        title: "Dina senaste resor",
        maxItems: 3,
        items: localStorage.getObject("recent") || []
    }, 
    saved: {
        title: "Sparade resor",
        maxItems: 50,
        items: localStorage.getObject("saved") || [] 
    }
};

renderDefaults();

input["from"].focus(function() {
    station = "from";
    input[station].attr("value", "");
});

input["to"].focus(function() {
    station = "to";
    input[station].attr("value", "");
});

var headerHeight = $("#header").outerHeight();
list["def"].css({
    position: "absolute",
    top: headerHeight + "px",
    bottom: 0,
    left: 0,
    right: 0
});

input["any"].live("keyup", function() {
    list[station].addClass("visible");
    list.def.removeClass("visible");
    // calculate height of list
    var top = $("#header").outerHeight() + 1;
    list[station].css({
        position: "absolute",
        top: top + "px",
        bottom: "0px",
        left: "0px",
        right: "0px"
    });
    var h = $("#header").outerHeight();
    var dh = $(window).height();
    list[station].css("height", (dh - h) + "px");
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
                list[station].find(".list-content").html(html);
            });
        }
    }, 500);
});

list["link"].live("click", function(e) {
    e.preventDefault();
    selected[station].id = $(this).attr("data-station-id");
    selected[station].name = concat($(this).html());
    resultHead[station].html(selected[station].name);
    input[station].attr("value", selected[station].name);
    list[station].removeClass("visible");

    if (station === "from") {
        container["to"].addClass("visible");
        input["to"].focus();
    } else if (station === "to") {
        doSearch()
    }

    return false;
});

$("#close-results").live("click", function(e) {
    e.preventDefault();
    // Reset everything
    selected.from.id = null;
    selected.from.name = "";
    selected.to.id = null;
    selected.to.name = "";
    list["from"].removeClass("visible");
    list["to"].removeClass("visible");
    input["from"].attr("value", "Från");
    input["to"].attr("value", "Till");
    container["to"].removeClass("visible");
    
    // Show default
    renderDefaults();
    list.def.addClass("visible");
    $("#result").removeClass("visible");

    // Reset loaders
    list["result"].find(".list-content").html("<div class=\"info\">Hämtar information om rutter</div>");
    list["from"].find(".list-content").html("<div class=\"info\">Hämtar matchande stationer</div>");
    list["to"].find(".list-content").html("<div class=\"info\">Hämtar matchande stationer</div>");
});

$("#default-list a").live("click", function(e) {
    e.preventDefault();
    var $this = $(this);
    selected.from.id = $this.attr("data-from");
    selected.from.name = $this.find(".from").html();
    selected.to.id = $this.attr("data-to");
    selected.to.name = $this.find(".to").html();
    resultHead.from.html(selected.from.name);
    resultHead.to.html(selected.to.name);
    doSearch();
});

$("#save-journey").live("click", function(e) {
    e.preventDefault();
    saveJourney("saved");
    $("#close-results").trigger("click");
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

function renderDefaults() {
    var html = [];
    var lists = ["saved", "recent"];
    for (var current = 0, nOfLists = lists.length; current < nOfLists; current++) {
        var currentList = storage[lists[current]];
        if (currentList.items.length > 0) {
            var items = currentList.items.reverse();
            debug("Has " + lists[current] + " searches");
            html.push("<h1><span>" + currentList.title + "</span></h1><ul>");
            for (var i = 0; i < items.length; i++) {
                html.push("<li><a href=\"#\" data-from=\"" + items[i].from.id + "\" data-to=\"" + items[i].to.id + "\"><span class=\"from\">" + items[i].from.name + "</span> > <span class=\"to\">" + items[i].to.name + "</span></a></li>");
            }
            html.push("</ul>");
        }
    }
    list.def.html(html.join(""));
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

function saveJourney(set) {
    // push to set if not already present
    var inSet = false;
    var items = storage[set].items.length;
    var inHistory = false;
    for (var i = 0; i < items; i++) {
        if (storage[set].items[i].from.id === selected.from.id && storage[set].items[i].to.id === selected.to.id) {
            debug("Already in " + set + ". Ignore!");
            inHistory = true;
            break;
        }
    }
    if(!inHistory) {
        debug("Not in " + set + ". Adding!");
        storage[set].items.push(selected);
        if (storage[set].items.length > storage[set].maxItems) {
            storage[set].items.shift();
        }
        localStorage.setObject(set, storage[set].items);
        storage[set].items = localStorage.getObject(set);
    }
}

function doSearch() {
    $("#result").addClass("visible");
    // calculate height of list
    var top = $("#result-header").outerHeight() + 1;
    var bottom = $("#result-footer").outerHeight() -1;
    list["result"].css({
        position: "absolute",
        top: top + "px",
        bottom: bottom + "px",
        left: "0px",
        right: "0px"
    });
    
    saveJourney("recent");
        
    var url = "http://slim-app.appspot.com/journey/" + selected.from.id + "/" + selected.to.id
    getJson(url, function(data) {
        data = data.HafasResponse.Trip;
        var html = [];
        html.push("<ul class=\"list\">");
        for (var i = 0, l = data.length; i < l; i++) {
            var dur = data[i].Summary.Duration.split(":");
            var duration = (dur[0] > 0 ? (dur[0] + " h ") : "") + dur[1] + " min";
            var arrival = typeof data[i].Summary.ArrivalTime === "object" ? data[i].Summary.ArrivalTime["#text"] : data[i].Summary.ArrivalTime;
            var departure = typeof data[i].Summary.DepartureTime === "object" ? data[i].Summary.DepartureTime["#text"] : data[i].Summary.DepartureTime;
            
            html.push("<li><a href=\"#\">");
            html.push("<span class=\"time\"><strong>" + departure + "</strong> &ndash; " + arrival + "</span> <span class=\"duration\">(" + duration + ")</span><br>");
            html.push("<span class=\"connections\">" + concat(data[i].Summary.Origin["#text"]) + " &ndash; " + concat(data[i].Summary.Destination["#text"]) + "</span> ");
            if (typeof data[i].SubTrip !== "undefined") {
              if (data[i].SubTrip instanceof Array) {
                for (var s = 0, sl = data[i].SubTrip.length; s < sl; s++) {
                  html.push(getIcon(data[i].SubTrip[s].Transport.Type, data[i].SubTrip[s].Transport.Line));
                }
              } else {
                  html.push(getIcon(data[i].SubTrip.Transport.Type, data[i].SubTrip.Transport.Line));
              }
            }
            html.push("</a></li>");
        }
        html.push("</ul>");
        list["result"].find(".list-content").html(html.join(""));
    });
}

/**
 * ScrollFix v0.1
 * http://www.joelambert.co.uk
 *
 * Copyright 2011, Joe Lambert.
 * Free to use under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 */

var ScrollFix = function(elem) {
	// Variables to track inputs
	var startY, startTopScroll;
	
	elem = elem || document.querySelector(elem);
	
	// If there is no element, then do nothing	
	if(!elem)
		return;

	// Handle the start of interactions
	elem.addEventListener('touchstart', function(event){
		startY = event.touches[0].pageY;
		startTopScroll = elem.scrollTop;
		
		if(startTopScroll <= 0)
			elem.scrollTop = 1;

		if(startTopScroll + elem.offsetHeight >= elem.scrollHeight)
			elem.scrollTop = elem.scrollHeight - elem.offsetHeight - 1;
	}, false);
};

new ScrollFix(document.getElementById("default-list"));
new ScrollFix(document.getElementById("from-list"));
new ScrollFix(document.getElementById("to-list"));
new ScrollFix(document.getElementById("result-list"));
