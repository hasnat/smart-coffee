import TpLinkCloud from "../shared/tplink-cloud.js";
import jsonApi from "../shared/json-api.js";

var tp = new TpLinkCloud;
var select = document.querySelector('#cloud-config-device');
var txtEmail = document.querySelector('#cloud-config-email');
var txtPassword = document.querySelector('#cloud-config-password');

document.querySelector("#cloud-config-list-devices").addEventListener('click', async (e) => {
    e.preventDefault();
    await tp.login(txtEmail.value, txtPassword.value);
    let devices = [];
    (await tp.getDeviceList()).forEach((device) => {
        // only HS110 supported as of now (no other models with eMeter exist)
        if (/^HS110/.test(device.deviceModel))
            devices.push(device);
    });

    while (select.firstChild)
        select.removeChild(select.firstChild);

    if (devices.length) {
        for (let i = 0; i < devices.length; i++) {
            select.appendChild(new Option(devices[i].alias, JSON.stringify(devices[i])));
        }
        select.disabled = false;
    } else {
        select.appendChild(new Option("No compatible devices found!", ""));
        select.disabled = true;
    }
});

document.querySelector("#cloud-config-save").addEventListener('click', async (e) => {
    if (select.value) {
        var device = JSON.parse(select.value);
        tp.deviceId = device.deviceId;
        tp.alias = device.alias;
        tp.appServerUrl = device.appServerUrl;
    }

    await jsonApi.post('/api/coffeemakers/', {
        cloud: tp
    });
});