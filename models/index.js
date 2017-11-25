import r from "../r";
import CoffeeMaker from "./coffeemaker";
import ActiveRecord from "./active-record";
import PushSubscription from "./push-subscription"

/**
 * @type {typeof ActiveRecord[]}
 */
const models = [CoffeeMaker, PushSubscription];

/**
 * Shoud we move this logic into ActiveRecord::boot() or something?
 */

export default r.tableList().run()
    .then(cursor => cursor.toArray())
    .then(async tableList => {
        for (let model of models) {
            await model.boot(tableList);
        }
    })
    .then(async () => {
        for (let model of models) {
            await model.afterBoot();
        }
    });
