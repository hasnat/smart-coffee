(function(window, navigator) {
    // If a test module has loaded and executed, it means the browser only didn't understand the nomodule attribute
    if (window.__supportsModules)
        return;

    if (/Firefox\/5[0-9.]+$/.test(navigator.userAgent)) {
        alert("Aktivoi tuki ES moduuleille: \nabout:config -> dom.moduleScripts.enabled -> true\ntai käytä Chromea :)");
    } else {
        alert("Voi harmi! Selaimesi ei tue näin hienoja juttuja.");
    }
})(this, this.navigator);