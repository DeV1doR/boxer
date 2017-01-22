define(['config', 'jquery', 'backbone', 'easel'], function(config, $, Backbone) {

    var gameLoop = function (event) {
        app.stage.update();
        if (app.currentCharacter) {
            app.currentCharacter.hud.trigger('updateFPS', createjs.Ticker.getMeasuredFPS());
        }

    };

    window.app = {};
    app.config = config;
    app.canvas = document.getElementById("gameBoard");
    app.canvas.width = 1280;
    app.canvas.height = 768;
    app.canvas.style.backgroundColor = "white";
    app.ctx = app.canvas.getContext("2d");
    app.keys = {};
    app.characters = {};
    app.shootMode = false;
    app.currentCharacter = null;
    app.stage = new createjs.Stage(app.canvas);
    app.stage.enableMouseOver(10);

    createjs.Ticker.addEventListener("tick", gameLoop);
    createjs.Ticker.setFPS(app.config.FPS);

    return app;

});