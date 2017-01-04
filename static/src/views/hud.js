var app = app || {},
    utils = utils || {};

(function() {
    'use strict';

    var size = 20,
        font = size + 'px Arial',
        color = '#ff7700',
        scale = 2;

    app.HudView = Backbone.View.extend({

        el: '#gameHUD',

        initCanvas: function() {
            this.$el = $(this.el).length ? this.$el : $(this.el).appendTo('.container');
            this.canvas = this.$el[0];
            this.canvas.width = app.canvas.width;
            this.canvas.height = 120;
            this.stage = new createjs.Stage(this.canvas);
        },
        initFPS: function() {
            this.textFPS = new createjs.Text();
            this.textFPS.font = font;
            this.textFPS.color = 'grey';
            this.textFPS.x = this.canvas.width - 100;
            this.textFPS.y = 0;
            this.stage.addChild(this.textFPS);
            this.on('updateFPS', this.updateFPS);
        },
        initOnline: function() {
            this.textOnline = new createjs.Text();
            this.textOnline.font = font;
            this.textOnline.color = 'grey';
            this.textOnline.x = this.canvas.width - 100;
            this.textOnline.y = size;
            this.stage.addChild(this.textOnline);
            this.on('updateOnline', this.updateOnline);
        },
        initMusicSwitcher: function() {
            var mutedText = (createjs.Sound.muted) ? 'Off' : 'On';
            this.textMusicSW = new createjs.Text();
            this.textMusicSW.font = font;
            this.textMusicSW.color = 'grey';
            this.textMusicSW.text = 'Music: ' + mutedText;
            this.textMusicSW.x = this.canvas.width - 100;
            this.textMusicSW.y = 2 * size;
            this.textMusicSW.on('click', this.updateMusicSwitcher, this);
            this.stage.addChild(this.textMusicSW);
        },
        initScores: function() {
            this.textScores = new createjs.Text();
            this.textScores.font = font;
            this.textScores.color = 'grey';
            this.textScores.x = this.canvas.width - 100;
            this.textScores.y = 3 * size;
            this.updateScores();
            this.model.on("change", this.updateScores, this);
            this.stage.addChild(this.textScores);
        },
        initAP: function() {
            this.imageActiveAP = [];
            this.model.on("change", this.updateAP, this);
            this.updateAP();
        },
        updateFPS: function(FPS) {
            this.textFPS.text = 'FPS: ' + FPS.toFixed(0);
            this.stage.update();
        },
        updateOnline: function(count) {
            this.textOnline.text = 'Online: ' + count;
            this.stage.update();
        },
        updateMusicSwitcher: function(event) {
            createjs.Sound.muted = (createjs.Sound.muted) ? false : true;
            var mutedText = (createjs.Sound.muted) ? 'Off' : 'On';
            this.textMusicSW.text = 'Music: ' + mutedText;
            this.stage.update();
        },
        updateScores: function() {
            this.textScores.text = 'Scores: ' + this.model.scores;
            this.stage.update();
        },
        updateAP: function() {
            var dist = 0,
                cAP = this.imageActiveAP.slice();
            this.imageActiveAP = [];
            for (var j = 0; j < cAP.length; j++) {
                this.stage.removeChild(cAP[j]);
            }
            for (var i = 0; i < this.model.AP; i++) {
                var img = app.baseImages['active-AP'].clone();
                img.scaleX = scale;
                img.scaleY = scale;
                img.x += (size) / 1.5 + dist;
                img.y += size / 1.5;
                this.stage.addChildAt(img, this.stage.numChildren - 1);
                this.imageActiveAP.push(img);
                dist += size;
            }
            this.stage.update();
        },

        // MAIN
        initialize: function() {
            _.extend(this, Backbone.Events);
            this.panelRight();
            this.panelLeft();
        },
        panelRight: function() {
            this.initCanvas();
            this.initFPS();
            this.initOnline();
            this.initMusicSwitcher();
            this.initScores();
        },
        panelLeft: function() {
            this.initAP();
        },
        render: function() {
            this.stage.update();
            return this;
        },
        destroy: function() {
            this.stage.removeAllEventListeners();
            this.stage.removeAllChildren();
            this.remove();
            this.unbind();
            delete this.stage;
        }
    });
})();
