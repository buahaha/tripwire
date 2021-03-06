tripwire.sync = function(mode, data, successCallback, alwaysCallback) {
    var data = typeof(data) === "object" ? $.extend(true, {}, data) : {};

    // Grab any pending changes
    $.extend(true, data, tripwire.data);

    // Remove old timer to prevent multiple
    if (this.timer) clearTimeout(this.timer);
    if (this.xhr) this.xhr.abort();

    if (mode == 'refresh' || mode == 'change') {
        data.signatureCount = Object.size(this.client.signatures);
        data.signatureTime = Object.maxTime(this.client.signatures, "modifiedTime");

        data.chainCount = Object.size(chain.data.rawMap);
        data.chainTime = Object.maxTime(chain.data.rawMap, "time");

        data.flareCount = chain.data.flares ? chain.data.flares.flares.length : 0;
        data.flareTime = chain.data.flares ? chain.data.flares.last_modified : 0;

        data.commentCount = Object.size(this.comments.data);
        data.commentTime = Object.maxTime(this.comments.data, "modified");

        data.activity = this.activity;
    } else {
        // Expand Tripwire with JSON data from EVE Data Dump and other static data
        $.extend(this, appData);

        this.aSystems = $.map(this.systems, function(system) { return system.name; });
        this.aSigSystems = ["Null-Sec", "Low-Sec", "High-Sec", "Class-1", "Class-2", "Class-3", "Class-4", "Class-5", "Class-6"];
        $.merge(this.aSigSystems, this.aSystems.slice());
    }

    data.mode = mode != "init" ? "refresh" : "init";
    data.systemID = viewingSystemID;
    data.systemName = viewingSystem;
    data.instance = tripwire.instance;
    data.version = tripwire.version;

    this.xhr = $.ajax({
        url: "refresh.php",
        data: data,
        type: "POST",
        dataType: "JSON",
        cache: false
    }).done(function(data) {
        if (data) {
            tripwire.server = data;

            if (data.esi) {
                tripwire.esi.parse(data.esi);
            }

            if (data.sync) {
                tripwire.serverTime.time = new Date(data.sync);
                tripwire.API();
            }

            if (data.signatures)
                tripwire.parse(data, mode);

            if (data.chain)
                tripwire.chainMap.parse(data.chain);

            if (data.comments)
                tripwire.comments.parse(data.comments)

            tripwire.active(data.activity);

            if (data.notify && !$("#serverNotification")[0]) Notify.trigger(data.notify, "yellow", false, "serverNotification");
        }

        tripwire.data = {tracking: {}, esi: {}};
        successCallback ? successCallback(data) : null;
    }).always(function(data, status) {
        tripwire.timer = setTimeout("tripwire.refresh();", tripwire.refreshRate);

        alwaysCallback ? alwaysCallback(data) : null;

        if (data.status == 403) {
            window.location.href = ".";
        } else if (status != "success" && status != "abort" && tripwire.connected == true) {
            tripwire.connected = false;
            $("#ConnectionSuccess").click();
            Notify.trigger("Error syncing with server", "red", false, "connectionError");
        } else if (status == "success" && tripwire.connected == false) {
            tripwire.connected = true;
            $("#connectionError").click();
            Notify.trigger("Successfully reconnected with server", "green", 5000, "connectionSuccess");
        }
    });

    return true;
}
tripwire.sync("init");
