/**
 * Created with JetBrains PhpStorm.
 * User: fridek
 * Date: 22.06.12
 * Time: 23:09
 * To change this template use File | Settings | File Templates.
 */

goog.require('goog.net.XhrIo');
goog.require('goog.events');

goog.require('prezentacja.templates.Table');
goog.require('prezentacja.Model');

goog.provide('prezentacja.Loader');

/**
 * @constructor
 */
prezentacja.Loader = function() {

};

prezentacja.Loader.prototype.loadNewPageHtml = function(target) {
    var xhr_ = new goog.net.XhrIo();

    goog.events.listen(xhr_, goog.net.EventType.COMPLETE, function(e) {
        var html = this.getResponseText();
        target.innerHTML = html;
    });

    xhr_.send('http://localhost/prezentacja_closure/public/index/paginationhtml');
};

prezentacja.Loader.prototype.loadNewPageJSON = function(target) {
    var xhr_ = new goog.net.XhrIo();

    goog.events.listen(xhr_, goog.net.EventType.COMPLETE, function(e) {
        var json = this.getResponseJson();

        var translated_json = prezentacja.Model.getInstance().importer(json);

        window.console.log(translated_json, json);

        target.innerHTML = prezentacja.templates.Table.table({
            baseUrl: 'http://localhost/prezentacja_closure/public/',
            data: translated_json
        });
    });

    xhr_.send('http://localhost/prezentacja_closure/public/index/paginationjson');
};