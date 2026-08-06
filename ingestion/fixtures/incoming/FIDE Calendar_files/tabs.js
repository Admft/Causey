class CalendarItcTabs {
    constructor(target, config) {
        const defaultConfig = {};
        this._config = Object.assign(defaultConfig, config);
        this._elTabs =
                typeof target === "string" ? document.querySelector(target) : target;
        this._elButtons = this._elTabs.querySelectorAll(".calendartabs-btn");
        this._elPanes = this._elTabs.querySelectorAll(".calendartabs-pane");
        this._eventShow = new Event("tab.itc.change");
        this._init();
        this._events();
    }
    _init() {
        this._elTabs.setAttribute("role", "caltablist");
        this._elButtons.forEach((el, index) => {
            el.dataset.index = index;
            el.setAttribute("role", "caltab");
            this._elPanes[index].setAttribute("role", "caltabpanel");
        });
    }
    show(elLinkTarget, iYear) {
        const elPaneTarget = this._elPanes[elLinkTarget.dataset.index];
        const elLinkActive = this._elTabs.querySelector(".calendartabs-btn-active");
        const elPaneShow = this._elTabs.querySelector(".calendartabs-pane-show");
        console.log('target' + elPaneTarget.id);
        console.log('panel' + elPaneShow.id);
        if (elPaneTarget.id == 'calendarcontent-7') {
//            e.preventDefault();
//            this.show(elPaneShow);
//            elPaneShow.classList.remove("calendartabs-pane-show") ;
//            elPaneShow.classList.remove("calendartabs-btn-active") ;
//            return;
        }
        //        if (elLinkTarget === elLinkActive) {
        if (elLinkTarget === elLinkActive && false) {
            return;
        }
        elLinkActive ? elLinkActive.classList.remove("calendartabs-btn-active") : null;
        elPaneShow ? elPaneShow.classList.remove("calendartabs-pane-show") : null;
        elLinkTarget.classList.add("calendartabs-btn-active");
        elPaneTarget.classList.add("calendartabs-pane-show");
        this._elTabs.dispatchEvent(this._eventShow);
        elLinkTarget.focus();
        console.log(elPaneTarget.id);

        switch (elPaneTarget.id) {
            case "calendarcontent-1":
                console.log('loadTiles');
                const state = {'page_id': 1, 'user_id': 5}
                const url = 'calendar.php'
//                history.pushState(state, '', url)
                loadTiles(iYear);
                saveHistory();
                break;
            case "calendarcontent-2":
                console.log('loadTable');
                loadTable(iYear);
                saveHistory();
                break;
            case "calendarcontent-4":
                console.log('loadYear ') + iYear;
            //    loadYear(spage);
                loadYear(iYear);
                saveHistory();
                break;
            case "calendarcontent-5":
                load();
                saveHistory();
                break;
        }
    }
    showByIndex(index, iYear) {
        const elLinkTarget = this._elButtons[index];
        elLinkTarget ? this.show(elLinkTarget, iYear) : null;
    }
    _events() {
        this._elTabs.addEventListener("click", (e) => {
            const target = e.target.closest(".calendartabs-btn");
            if (target) {
                console.log('target in events:' + target.id);
                if (target.id !== 'btnLogout' && target.id!=='btnLogin') {
            //    e.preventDefault();
                    this.show(target);
                } else if (target.id=='btnLogin'){
                    window.location.href = 'dashboard.php';
                }
                ;
            }
        });
    }
}
const itlTab = new CalendarItcTabs(".calendartabs");

function loadTable(page = 1) {
    $(".filterdiv").show();
    $("#contContainer").show();
    $("#select_container_1").show();
    console.log('loading table');
    $(".page-title").text("All Events");
    spage = page;
    show = 'table';
    var countryData = $("#select_container_1 .country").countrySelect("getSelectedCountryData");
    console.log(countryData.iso2);
//    console.log(isoFlags(countryData.iso2));
    console.log('event_type:' + $('#select_container_1 .event_type option:selected').val())
    console.log('time_control' + $('#select_container_1 .time_control option:selected').val())
    console.log('page' + page);
    var cat_filter_array = $.map($('input[name="cat_check"]:checked'), function(c){return c.value; });
    var cat_cont = $.map($('input[name="cat_cont"]:checked:visible'), function(c){return c.value; });

    console.log(cat_filter_array);

// запускаем ajax-запрос, устанавливаем обработчики событий.
// Возвращаемые методом $.get объект сохраним в переменной jqxhr для дальнейшего использования
    var data;
    data = {'country': countryData.iso2,
        'name_filter': $('#name_filter_1').val(),
        'event_type': $(' .event_type option:selected').val(),
        'time_control': $(' .time_control option:selected').val(),
        'page': page,
        'cat_filter': cat_filter_array,
        'cat_cont': cat_cont,
        'from_date': $("#from_date1").val(),
        'to_date': $("#to_date1").val(),
        'show': 'table'};
    console.log(data);
    var jqxhr = $.post("calendar_server.php", data, function () {
        //alert("success");
    })
            .done(function (retval) {
                //console.log(retval);
                $('#calendar_h_body').remove();
                $('#calendarcontent-2 .ranking-pagination').remove();
                $('#calendarcontent-2').html(retval);

            })
            .fail(function () {
                alert("error");
            })
            .always(function () {
                //alert("finished"); 
            });
    // data.show='apilist';
    // var apireq = $.post("calendar_server.php", data, function () {
    //     //alert("success");
    // })
    //         .done(function (retval) {
    //             //console.log(retval);
    //             console.log('api:');
    //             console.log(retval);
    //         })
    //         .fail(function () {
    //             alert("error");
    //         })
    //         .always(function () {
    //             //alert("finished"); 
    //         });
    // установим еще один обработчик завершения запроса
    //jqxhr.always(function(){ alert("second finished"); });
    //$( '#calendar_h_body').html('');
    $("#cat_check1").parent().show();
    $("#cat_check2").parent().show();
    $("#cat_check3").parent().show();
    $("#cat_check4").parent().show();
    $("#btnDetails").hide();
}
function insertParam(key, value) {
    key = encodeURIComponent(key);
    value = encodeURIComponent(value);

    // kvp looks like ['key1=value1', 'key2=value2', ...]
    var kvp = document.location.search.substr(1).split('&');
    let i = 0;

    for (; i < kvp.length; i++) {
        if (kvp[i].startsWith(key + '=')) {
            let pair = kvp[i].split('=');
            pair[1] = value;
            kvp[i] = pair.join('=');
            break;
        }
    }

    if (i >= kvp.length) {
        kvp[kvp.length] = [key, value].join('=');
    }

    // can return this or...
    let params = kvp.join('&');
    return params;
    // reload page with new params
//    document.location.search = params;
}
function loadTiles(page = 1) {
    $(".filterdiv").show();
    $("#contContainer").show();
    $("#select_container_1").show();
    console.log('loading tiles');
    $(".page-title").text("All Events");
    spage = page;
    show = 'tiles';
    console.log('name_filter:' + $('#name_filter_1').val())
    var countryData = $("#select_container_1 .country").countrySelect("getSelectedCountryData");
    console.log(countryData.iso2);
//    console.log(isoFlags(countryData.iso2));
    console.log(countryData);
    console.log('event_type:' + $('#select_container_1 .event_type option:selected').val())
    console.log('time_control' + $('#select_container_1 .time_control option:selected').val())
    console.log('page' + page);
    console.log('From' + $("#from_date1").val());
    console.log('To' + $("#to_date1").val());
    var cat_filter_array = $.map($('input[name="cat_check"]:checked'), function(c){return c.value; });
    var cat_cont = $.map($('input[name="cat_cont"]:checked:visible'), function(c){return c.value; });
    console.log(cat_filter_array);

// запускаем ajax-запрос, устанавливаем обработчики событий.
// Возвращаемые методом $.get объект сохраним в переменной jqxhr для дальнейшего использования
    var data;
    data = {'country': countryData.iso2,
        'name_filter': $('#name_filter_1').val(),
        'event_type': $('#select_container_1 .event_type option:selected').val().toString(),
        'time_control': $('#select_container_1 .time_control option:selected').val(),
        'page': page,
        'cat_filter': cat_filter_array,
        'cat_cont': cat_cont,
        'from_date': $("#from_date1").val(),
        'to_date': $("#to_date1").val(),
        'show': 'tiles'};
    console.log(data);
    console.log('history string: ' + JSON.stringify(data));
    var jqxhr = $.post("calendar_server.php", data, function () {
        //alert("success");
    })
            .done(function (retval) {
                //console.log(retval);
                $('#calendar-t-body').remove();
                $('#calendarcontent-1 .ranking-pagination').remove();
                $('#calendarcontent-1').html(retval);
            })
            .fail(function () {
                alert("error");
            })
            .always(function () {
                //alert("finished"); 
            });

    // установим еще один обработчик завершения запроса
    //jqxhr.always(function(){ alert("second finished"); });
    //$( '#calendar_h_body').html('');
    $("#cat_check1").parent().show();
    $("#cat_check2").parent().show();
    $("#cat_check3").parent().show();
    $("#cat_check4").parent().show();
    $("#btnDetails").hide();
}

function loadYear(page,showFIDE = 0) {
    $(".filterdiv").show();
    $("#contContainer").show();
    $("#select_container_1").show();
    if (!page) {
        page=spage;
    }
        $(".page-title-year").text(page);
    spage = page;
    show = "showYear";
    console.log('loading year ' + page);
    console.log('name_filter:' + $('#name_filter_1').val())
    var countryData = $("#select_container_1 .country").countrySelect("getSelectedCountryData");
    console.log(countryData.iso2);
//    console.log(isoFlags(countryData.iso2));
    console.log('event_type:' + $('#calendarcontent-1 .event_type option:selected').val())
    console.log('time_control' + $('#calendarcontent-1 .time_control option:selected').val())
    console.log('page' + page);
    // $("#cat_check1").parent().hide();
    // $("#cat_check2").parent().hide();
    // $("#cat_check4").parent().hide();
    var cat_filter_array = $.map($('input[name="cat_check"]:checked:visible'), function(c){return c.value; });
    var cat_cont = $.map($('input[name="cat_cont"]:checked:visible'), function(c){return c.value; });
    console.log(cat_filter_array);
// запускаем ajax-запрос, устанавливаем обработчики событий.
// Возвращаемые методом $.get объект сохраним в переменной jqxhr для дальнейшего использования
    var data;
    var showCommand;
    if (showFIDE>0){showCommand="showFIDE"} else {showCommand="showYear"}
    data = {'country': countryData.iso2,
        'name_filter': $('#name_filter_1').val(),
        'event_type': $('#calendarcontent-1 .event_type option:selected').val().toString(),
        'time_control': $('#calendarcontent-1 .time_control option:selected').val(),
        'page': page,
        'cat_filter': cat_filter_array,
        'cat_cont': cat_cont,
        'id': null,
        'show': showCommand};
    console.log(data);
    var jqxhr = $.post("calendar_server.php", data, function () {
        //alert("success");
    })
            .done(function (retval) {
//        console.log(retval);
                $('#calendar_y_body').remove();
                $('#calendarcontent-4 .ranking-pagination').remove();
                $('#select_container_4').after(retval);

            })
            .fail(function () {
                alert("error");
            })
            .always(function () {
                //alert("finished"); 
            });
            $("#btnDetails").hide();
    // установим еще один обработчик завершения запроса
    //jqxhr.always(function(){ alert("second finished"); });
    //$( '#calendar_h_body').html('');
}

function mapFindCity() {
    city = $("#mapCity").val() + $("#venue_address").val();
    var geocoder = new google.maps.Geocoder();
    geocoder.geocode({'address': city}, function (results, status) {
        if (status === 'OK') {
            map.setCenter(results[0].geometry.location);
        } else {

            $("#mapError").dialog({
                open: function (eve, ui) {
                    $("#mapError").html(status);
                    var item = $(this);
                    //item.dialog( "close" );
                    window.setTimeout(function () {
                        item.dialog('close');
                    }, 2000);
                }
            });

        }
    });
}

function showTmnt(id = 1, preview = 0) {
    //history.pushState('Data', id, 'calendar.php?id='+id);
    itlTab.showByIndex(4);

    $(".filterdiv").hide();
    $("#contContainer").hide();
    $("#select_container_1").hide();
    $("#btnDetails").show();
    $.get("calendar_server.php?id=" + id + "&preview=" + preview, function (data) {
//      console.log( typeof data ); // string
//      console.log( data ); // HTML content of the jQuery.ajax page
        $('#calendarcontent-6').html(data);

        let eventTitleElement = $('section h2.event-title');

        if (eventTitleElement.length > 0) {
            let eventTitle = eventTitleElement.text();

            document.title = eventTitle;
            $('meta[property="og:title"]').attr('content', eventTitle);

            console.log("Document title set to: " + eventTitle);
            console.log("og:title set to: " + eventTitle);

        } else {
            console.warn("No h2.event-title found within a section.");
        }
//        saveHistory();
    });
}

function showVenue(lat, lon) {
    console.log('lat:' + lat);
    console.log('lon:' + lon);
//    console.log($("#map_canvas").html());
    itlTab.showByIndex(3);
    map.setZoom(14);
    map.panTo({lat: lat, lng: lon});
}
