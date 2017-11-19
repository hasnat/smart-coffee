import r from "../r";
import CoffeeMaker from "./coffeemaker";
import PushSubscription from "./push-subscription"

const models = [CoffeeMaker, PushSubscription];

/**
 * Shoud we move this logic into ActiveRecord::boot() or something?
 */

export default r.tableList().run()
    .then((cursor) => cursor.toArray())
    .then((tableList) => {
        models.forEach(async (model) => {
            const table = model.table;

            if (tableList.indexOf(table) === -1) {
                await r.tableCreate(table, { primaryKey: model.primaryKey }).run();
                console.info(`Created table '${table}'`);
            } else {
                console.info(`Table '${table}' already created`);
            }
        });

        /**
         * All tables created, let's proceed with other stuff
         */        
        return CoffeeMaker.startListening();
    });
