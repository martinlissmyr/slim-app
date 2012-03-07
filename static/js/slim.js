Storage.prototype.setObject = function(key, value) { this.setItem(key, JSON.stringify(value)); }
Storage.prototype.getObject = function(key) { return this.getItem(key) && JSON.parse(this.getItem(key)); }
var input = { from: $("#from"), to: $("#to"), any: $("#from,#to") },
    container = { from: $("#from-container"), to: $("#to-container") },
    list = { from: $("#from-list"), to: $("#to-list"), link: $("#from-list a,#to-list a"), def: $("#default-list"), result: $("#result-list") },
    resultHead = { from: $("#result-from"), to: $("#result-to"), stations: $("#result-from,#result-to"), time: $("#result-time"), timeSelect: $("#datetime") },
    selected = { from: { id: null, name: "" }, to: { id: null, name: "" } },
    buttons = { save: $("#save-journey"), remove: $("#remove-journey"), close: $("#close-results") },
    station = "",
    searchTimer,
    storage = { 
        recent: { 
            title: "Dina senaste resor",
            maxItems: 10,
            items: localStorage.getObject("recent") || []
        }, 
        saved: {
            title: "Sparade resor",
            maxItems: 50,
            items: localStorage.getObject("saved") || [] 
        }
    },
    headerHeight = $("#header").outerHeight();

renderDefaults();
registerEvents();
list.def.css({
    position: "absolute",
    top: headerHeight + "px",
    bottom: 0,
    left: 0,
    right: 0
});

function registerEvents() {
    $("#result-list li").live("click", function(e) {
        e.preventDefault();
        var $self = $(this);
        var $details = $self.find(".details");
        if ($details.hasClass("visible")) {
            $details.css("display", "none");
            $details.removeClass("visible");
        } else {
            $details.css("display", "block");
            $details.addClass("visible");
        }
        $self.toggleClass("opened");
    });

    input.from.focus(function() {
        station = "from";
        input[station].attr("value", "");
    });
    
    input.to.focus(function() {
        station = "to";
        input[station].attr("value", "");
    });
    
    resultHead.stations.live("touchend", function() {
        reverseJourney();
        list.result.find(".list-content").html("<div class=\"info\">Hämtar information om rutter</div>");
        doSearch();
    });
    
    resultHead.time.live("touchend", function() {
        resultHead.timeSelect.focus();
    });
    
    resultHead.timeSelect.bind("blur", function() {
        var $self = $(this);
        resultHead.time.html($self.attr("value"));
    });
    
    input.any.live("keyup", function() {
        list[station].css("display", "block");
        list[station].addClass("visible");
        list.def.removeClass("visible");
        list.def.css("display", "none");
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
                getJson(url, true, function(data) {
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
    
    list.link.live("click", function(e) {
        e.preventDefault();
        selected[station].id = $(this).attr("data-station-id");
        selected[station].name = concat($(this).html());
        resultHead[station].html(selected[station].name);
        input[station].attr("value", selected[station].name);
        list[station].removeClass("visible");
        list[station].css("display", "none");
    
        if (station === "from") {
            container["to"].css("display", "block");
            container["to"].addClass("visible");
            input["to"].focus();
        } else if (station === "to") {
            doSearch()
        }
    
        return false;
    });
    
    buttons.close.live("click", function(e) {
        e.preventDefault();
        // Reset everything
        selected.from.id = null;
        selected.from.name = "";
        selected.to.id = null;
        selected.to.name = "";
        list["from"].removeClass("visible");
        list["from"].css("display", "none");
        list["to"].removeClass("visible");
        list["to"].css("display", "none");
        input["from"].attr("value", "Från");
        input["to"].attr("value", "Till");
        container["to"].removeClass("visible");
        container["to"].css("display", "none");
        
        // Show default
        renderDefaults();
        list.def.css("display", "block");
        list.def.addClass("visible");
        $("#result").removeClass("visible");
        $("#result").css("display", "none");
    
        // Reset loaders
        list.result.find(".list-content").html("<div class=\"info\">Hämtar information om rutter</div>");
        list.from.find(".list-content").html("<div class=\"info\">Hämtar matchande stationer</div>");
        list.to.find(".list-content").html("<div class=\"info\">Hämtar matchande stationer</div>");
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
    
    buttons.save.live("click", function(e) {
        e.preventDefault();
        storeJourney("saved");
        buttons.close.trigger("click");
    });
    
    buttons.remove.live("click", function(e) {
        e.preventDefault();
        deleteStoredJourney("saved");
        buttons.close.trigger("click");
    });
}



function debug(str) {
    if (typeof console != "undefined") { console.log(str); }
}

function getJson(url, useCache, callback) {
    $.ajax({
        url: url,
        dataType: "jsonp",
        cache: useCache || true,
        jsonpCallback: "slim",
        crossDomain: true,
        success: function(data) {
            debug("Got data from " + url);
            if(typeof callback !== "undefined") {
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
            var items = currentList.items;
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


function reverseJourney() {
    var temp = selected.to;
    selected.to = selected.from;
    selected.from = temp;
    resultHead.to.html(selected.to.name);
    resultHead.from.html(selected.from.name);
}

function isStored(set) {
    var inSet = false;
    var items = storage[set].items;
    for (var i = 0, l = items.length; i < l; i++) {
        if (items[i].from.id === selected.from.id && items[i].to.id === selected.to.id) {
            debug("Current journey in " + set + "!");
            inSet = true;
            break;
        }
    }
    return inSet;
}

function storeJourney(set) {
    // push to set if not already present
    if(!isStored(set)) {
        debug("Not in " + set + ". Adding!");
        storage[set].items.unshift(selected);
        if (storage[set].items.length > storage[set].maxItems) {
            storage[set].items.pop();
        }
        localStorage.setObject(set, storage[set].items);
        storage[set].items = localStorage.getObject(set);
    }
}

function deleteStoredJourney(set) {
    // delete a stored journey
    var items = storage[set].items;
    for (var i = 0, l = items.length; i < l; i++) {
        if (items[i].from.id === selected.from.id && items[i].to.id === selected.to.id) {
            items.splice(i, 1);
            break;
        }
    }
    localStorage.setObject(set, items);
}


function doSearch() {
    $("#result").css("display", "block");
    // calculate height of list
    var top = $("#result-header").outerHeight() + 1;
    var bottom = $("#result-footer").outerHeight() -1;
    list["result"].css({
        position: "absolute",
        top: top + "px",
        left: "0px",
        right: "0px"
    });
    $("#result").addClass("visible");
    
    storeJourney("recent");
    
    if (isStored("saved")) {
        // This journey is saved. Offer possibility to delete
        buttons.save.hide();
        buttons.remove.show();
    } else {
        // This journey is not saved. Offer possibility to store
        buttons.save.show();
        buttons.remove.hide();
    }
        
    var url = "http://slim-app.appspot.com/journey/" + selected.from.id + "/" + selected.to.id
    getJson(url, false, function(data) {
        data = data.HafasResponse.Trip;
        var html = [];
        html.push("<ul class=\"list\">");
        for (var i = 0, l = data.length; i < l; i++) {
            var dur = data[i].Summary.Duration.split(":");
            var duration = (dur[0] > 0 ? (dur[0] + " h ") : "") + dur[1] + " min";
            var arrival = typeof data[i].Summary.ArrivalTime === "object" ? data[i].Summary.ArrivalTime["#text"] : data[i].Summary.ArrivalTime;
            var departure = typeof data[i].Summary.DepartureTime === "object" ? data[i].Summary.DepartureTime["#text"] : data[i].Summary.DepartureTime;
            
            html.push("<li><a href=\"#\">");
            html.push("<span class=\"time\"><strong>" + departure + "</strong> &mdash; " + arrival + "</span> <span class=\"duration\">(" + duration + ")</span><br>");
            html.push("<span class=\"connections\">" + concat(data[i].Summary.Origin["#text"]) + " &ndash; " + concat(data[i].Summary.Destination["#text"]) + "</span> ");
            if (typeof data[i].SubTrip !== "undefined") {
              html.push("<div class=\"icons\">");
              if (data[i].SubTrip instanceof Array) {
                for (var s = 0, sl = data[i].SubTrip.length; s < sl; s++) {
                  html.push(getIcon(data[i].SubTrip[s].Transport.Type, data[i].SubTrip[s].Transport.Line));
                }
              } else {
                  html.push(getIcon(data[i].SubTrip.Transport.Type, data[i].SubTrip.Transport.Line));
              }
              html.push("</div>");
            }
            html.push("</a>");
            html.push("<ul class=\"details\">");
            if (data[i].SubTrip instanceof Array) {
                for (var s = 0, sl = data[i].SubTrip.length; s < sl; s++) {
                    var time;
                    if (data[i].SubTrip[s].DepartureTime instanceof Object) {
                        time = data[i].SubTrip[s].DepartureTime["#text"];
                    } else {
                        time = data[i].SubTrip[s].DepartureTime;
                    }
                
                    html.push("<li><span class=\"time\">" + time + "</span> Vid " + data[i].SubTrip[s].Origin["#text"] + (s === 0 ? " stig på " : " byt till ") + data[i].SubTrip[s].Transport.Name + " mot " + data[i].SubTrip[s].Transport.Towards + "</li>");
                }
            } else {
                debug(data[i]);
                var time;
                if (data[i].Summary.DepartureTime instanceof Object) {
                    time = data[i].Summary.DepartureTime["#text"];
                } else {
                    time = data[i].Summary.DepartureTime;
                }
                html.push("<li><span class=\"time\">" + time + "</span> Vid " + data[i].Summary.Origin["#text"] + " stig på " + data[i].SubTrip.Transport.Name + " mot " + data[i].SubTrip.Transport.Towards + "</li>")
            }
            var arrivalTime;
            if (data[i].Summary.ArrivalTime instanceof Object) {
                arrivalTime = data[i].Summary.ArrivalTime["#text"];
            } else {
                arrivalTime = data[i].Summary.ArrivalTime;
            }
            html.push("<li><span class=\"time\">" + arrivalTime + "</span> Stig av vid " + data[i].Summary.Destination["#text"] + "</li>")
            html.push("</ul>");
            html.push("</li>");
        }
        html.push("</ul>");
        list.result.find(".list-content").html(html.join(""));
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
