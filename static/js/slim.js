var fromInput = $("#from");
var toInput = $("#to");
var fromContainer = $("#from-container");
var toContainer = $("#to-container");
var fromList = $("#from-selection");
var toList = $("#to-selection");
var selected = { from: "", to: "" };
var station = "";

fromInput.focus(function() {
    //toContainer.slideUp("fast");
    fromInput.attr("value", "");
    station = "from";
});

toInput.focus(function() {
    toInput.attr("value", "");
    station = "to";
});

fromInput.live("keyup", function() {
    var val = fromInput.attr("value");
    if (val.length > 1) {
        var url = "http://slim-app.appspot.com/station/" + val;
        $.ajax({
            url: url,
            dataType: "jsonp",
            cache: true,
            jsonpCallback: "slim",
            crossDomain: true,
            success: function(data) {
                populateList(fromList, data.Hafas.Sites.Site instanceof Array ? data.Hafas.Sites.Site : [data.Hafas.Sites.Site]);
            }
        });
    }
});

toInput.live("keyup", function() {
    var val = toInput.attr("value");
    if (val.length > 1) {
        var url = "http://slim-app.appspot.com/station/" + val;
        $.ajax({
            url: url,
            dataType: "jsonp",
            cache: true,
            jsonpCallback: "slim",
            crossDomain: true,
            success: function(data) {
                populateList(toList, data.Hafas.Sites.Site instanceof Array ? data.Hafas.Sites.Site : [data.Hafas.Sites.Site]);
            }
        });
    }
});


$("#from-selection li").live("click", function() {
    selected[station] = $(this).attr("data-station-id");
    fromList.hide();
    fromInput.attr("value", $(this).html());
    toContainer.slideDown("fast");
    toInput.focus();
});

function populateList(list, data) {
    var html = "<ul class=\"list\">";
    for (var i = 0, l = data.length; i < l; i++) {
        if (typeof data[i].Name != "undefined") {
            if (!data[i].Name.match(/([A-Z]|[ÅÄÖ]){2,}/)) {
                html += "<li data-station-id=\"" + data[i].Number + "\">" + data[i].Name + "</li>";
            }
        }
    }
    html += "</ul>";
    list.html(html);
}