import dns from 'dns';
import os from 'os';

const ifaces = os.networkInterfaces();
const ownIps = [];
for (const ifname of Object.keys(ifaces)) {
    for (const ip of ifaces[ifname]) {
        // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
        if (ip.family !== 'IPv4' || ip.internal !== false)
            continue;

        ownIps.push(ip.address);
    }
}

export default function (host) {
    return new Promise((resolve, reject) => {
        dns.resolve4(host, (err, addresses) => {
            if (err) {
                reject(err);
            } else if (addresses.filter(addr => ownIps.includes(addr)).length === 0) {
                reject(new Error(`None of the ips (${addresses}) of the domain ${host} points to this host.`));
            } else {
                resolve();
            }
        });
    });
};