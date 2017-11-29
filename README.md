## Installation (for development)

```
git clone git@github.com:cappe/coffee.git
cd coffee
npm install
```

You will also need a [RethinkDB server](https://rethinkdb.com/docs/install/ "How to install RethinkDB server").

Finally copy .env.example to .env and set the config values. VAPID key creation has not yet been automated in this app, however, it is possible to do using the webpush module.

## Debug
```
npm run-script debug
```

## Run without debug
```
npm run-script start
```

# Credits
Icons made by [Freepik](http://www.freepik.com "Freepik") from [www.flaticon.com](https://www.flaticon.com "Flaticon") are licensed by [CC 3.0 BY](http://creativecommons.org/licenses/by/3.0/ "Creative Commons BY 3.0")
