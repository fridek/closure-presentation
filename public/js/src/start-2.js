/**
 * Created with JetBrains PhpStorm.
 * User: fridek
 * Date: 22.06.12
 * Time: 22:59
 * To change this template use File | Settings | File Templates.
 */

goog.require('goog.dom');
goog.require('goog.events');

goog.require('prezentacja.Loader');

goog.provide('prezentacja.Start2');

/**
 *
 * @constructor
 */
prezentacja.Start2 = function() {
    /**
     * @type {Element}
     */
    var button = goog.dom.getElement('next-page');

    var table = goog.dom.getElement('table-contents');

    /**
     * @type {prezentacja.Loader}
     * @private
     */
    this.loader_ = new prezentacja.Loader();

    goog.events.listen(button, goog.events.EventType.CLICK, function(e) {
        this.loader_.loadNewPageJSON(table);
        e.preventDefault();
    }, false, this);

    this.loader_.loadNewPageJSON(table);
};

new prezentacja.Start2();