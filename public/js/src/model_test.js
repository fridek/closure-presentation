/**
 * Created with JetBrains PhpStorm.
 * User: fridek
 * Date: 26.06.12
 * Time: 22:27
 * To change this template use File | Settings | File Templates.
 */

goog.require('goog.string');
goog.require('goog.testing.jsunit');

goog.require('prezentacja.Model');

var testStartsWith = function() {
    assertTrue('Should start with \'\'', goog.string.startsWith('abcd', ''));
    assertTrue('Should start with \'ab\'', goog.string.startsWith('abcd', 'ab'));
};

var testModelImport = function() {
    var rawData = [{
        "name": "test1",
        "address": "test2",
        "www": "test3",
        "email": "test4",
        "leg_count": "10"
    }];

    var data = prezentacja.Model.getInstance().importer(rawData);

    assertEquals("name should be equal", rawData[0]["name"], data[0].name);
    assertEquals("address should be equal", rawData[0]["address"], data[0].address);
    assertEquals("www should be equal", rawData[0]["www"], data[0].www);
    assertEquals("name should be equal", rawData[0]["name"], data[0].name);
    assertEquals("leg_count should be equal", 10, data[0].leg_count);
//    assertEquals("leg_count should be equal", rawData[0]["leg_count"], data[0].leg_count);
};
