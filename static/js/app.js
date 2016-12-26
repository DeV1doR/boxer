var app = app || {},
    utils = utils || {};

$(function () {
    'use strict';

    var gameLoop = function (event) {
        /** Keys notation
        * 49 - '1'
        * 38 - 'w'
        * 40 - 's'
        * 39 - 'd'
        * 37 - 'a'
        * 87 - key up
        * 83 - key down
        * 68 - key right
        * 65 - key left
        **/

        app.stage.update();
        // FOR FUTURE GRID SYSTEM
        // utils.drawBoard();
        // utils._LOG('Current FPS: ' + createjs.Ticker.getMeasuredFPS());

        if (app.user === null || app.commandsBlocked || app.keys[38] && app.keys[87] || app.keys[40] && app.keys[83] ||
          app.keys[39] && app.keys[68] || app.keys[37] && app.keys[65]) return;

        if (app.keys[38] || app.keys[87]) {
            app.user.move('walk', 'top');
        }
        else if (app.keys[40] || app.keys[83]) {
            app.user.move('walk', 'bottom');
        }
        else if (app.keys[39] || app.keys[68]) {
            app.user.move('walk', 'right');
        }
        else if (app.keys[37] || app.keys[65]) {
            app.user.move('walk', 'left');
        }

    };

    var Stream = {
        init: function (app) {
            var ws = new WebSocket("ws://" + app.config.WEBSOCKET_ADDRESS + "/game");
            _.extend(ws, Backbone.Events);

            ws.onmessage = function(evt) {
                var answer = JSON.parse(evt.data);
                var parsedData = answer.data;
                ws.trigger(answer.msg_type, parsedData);
            };
            ws.onopen = function(evt) {
                $('#conn_status').html('<b>WS Connected</b>');
            };
            ws.onerror = function(evt) {
                $('#conn_status').html('<b>WS Error</b>');
            };
            ws.onclose = function(evt) {
                $('#conn_status').html('<b>WS Closed</b>');
            };
            ws.on('render_map', function(data) {
                app.canvas.width = data.width;
                app.canvas.height = data.height;
            });
            ws.on('register_user', function(data) {
                app.user = new app.UserModel(data);
                app.sprites[app.user.id] = new app.SpriteView({ model: app.user });
                app.hud = new app.HudView({ model: app.user });
                app.weaponVision = new app.WeaponVisionView({ model: app.user });
            });
            ws.on('unregister_user', function(data) {
                app.users[data.id].destroy();
                app.sprites[data.id].destroy();
            });
            ws.on('player_update', function(data) {
                app.user.refreshData(data);
            });
            ws.on('users_map', function(data) {
                for (var user_id in data) {
                    user_id = parseInt(user_id, 0);
                    if (app.user && app.user.id !== user_id) {
                        var otherUser = data[user_id];
                        otherUser = (typeof otherUser === 'string') ? JSON.parse(otherUser) : otherUser;
                        if (app.users.hasOwnProperty(user_id)) {
                            app.users[user_id].refreshData(otherUser);
                        } else {
                            app.users[user_id] = new app.UserModel(otherUser);
                            app.sprites[user_id] = new app.SpriteView({ model: app.user });  
                        }
                    }
                }
            });

            app.ws = ws;
        }
    };

    app.canvas = document.getElementById("gameBoard"),
    app.ctx = app.canvas.getContext("2d");
    app.keys = {};
    app.users = {};
    app.user = null;
    app.sprites = {};
    app.commandsBlocked = false;
    app.stage = new createjs.Stage(app.canvas);

    Stream.init(app);

    // HARDCODED
    // var audioPath = "media/sounds/weapons/m60/";
    // var sounds = [
    //     {id: "m60-fire", src: "fire.ogg"},
    // ];
 
    //  _.extend(createjs.Sound, Backbone.Events);
    // createjs.Sound.alternateExtensions = ["mp3"];
    // createjs.Sound.on("fire", handleFire);
    // createjs.Sound.registerSounds(sounds, audioPath);

    // function handleFire(soundId) {
    //     if (createjs.Sound.isReady() && !app.commandsBlocked) {
    //         createjs.Sound.play(soundId);
    //     }
    // }

    // END HARDCODED

    createjs.Ticker.setFPS(app.config.FPS);
    createjs.Ticker.addEventListener("tick", gameLoop);

    window.addEventListener("keydown", function (e) {
        app.keys[e.keyCode] = true;
        // button '1'
        if (app.keys[49]) {
            app.user.equipWeapon();
        }
        // button 'space'
        if (app.keys[32]) {
            if (app.commandsBlocked) return;
            app.user.shoot();
            // FIRE effect
            // createjs.Sound.trigger('fire', 'm60-fire');
            app.commandsBlocked = true;
            setTimeout(function() {
                app.commandsBlocked = false;
            }, 2000);
        }
    });
    window.addEventListener("keyup", function (e) {
        app.keys[e.keyCode] = false;

        if (app.user && !app.keys[38] && !app.keys[87] && !app.keys[40] &&
            !app.keys[83] && !app.keys[39] && !app.keys[68] && !app.keys[37] &&
            !app.keys[65]) app.user.stop();
    });
    window.onbeforeunload = function() {
        var data = JSON.stringify({
            msg_type: 'unregister_user'
        })
        app.ws.send(data);
    };
});