/**
 * Created with JetBrains PhpStorm.
 * User: fridek
 * Date: 23.06.12
 * Time: 00:19
 * To change this template use File | Settings | File Templates.
 */

goog.provide('prezentacja.Model');

prezentacja.Model = function() {

};
goog.addSingletonGetter(prezentacja.Model);

/**
 *
 * @param {Array.<Array>} rawData
 * @return {Array.<{name: string, address: string, www: string,
 * email: string, leg_count: number}>}
 */
prezentacja.Model.prototype.importer = function(rawData) {
    var result = [];
    for(var i = 0; i < rawData.length; i++) {
        result[i] = {
            name: rawData[i]["name"],
            address: rawData[i]["address"],
            www: rawData[i]["www"],
            email: rawData[i]["email"],
            leg_count: parseInt(rawData[i]["leg_count"], 10)
        };
    }

    return result;
};