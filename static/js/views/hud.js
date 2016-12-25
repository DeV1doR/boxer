var app = app || {},
    utils = utils || {};

(function() {
    'use strict';

    app.HudView = Backbone.View.extend({

        el: 'canvas',

        initialize: function(options) {
            this._text = new createjs.Text();
            this._text.font = '40px Arial';
            this._text.color = '#ff7700';
            this._text.text = 'HP: ' + options.health;
            this._text.x = app.canvas.width - 145;
            this._text.y -= 5;
            this.render();
        },

        render: function(options) {
            app.stage.addChild(this._text);
            return this._text;
        },

        update: function(options) {
            this._text.text = 'HP: ' + options.health;
        },

    });
})();
